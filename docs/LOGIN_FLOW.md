# Login Flow

## Purpose
This document aims to give an overview of the login and logout process to help
understand the different components involved and how they interact with each
other.

## Architecture

> [!NOTE]
> The service worker is not yet fully implemented, and currently everything runs
> in a browsing context. Nevertheless, the information below is relevant to
> understand the architectural decisions made.

Group Income is designed to have certain parts that run in the browsing context
(i.e., a browser tab or window) and parts that run in a service worker. The
reason to separate it like this is threefold:

  * **Performance**. By having certain parts not run in the browsing context,
    these parts can run in a different thread or process, which makes
    interacting with the app feel (or in fact be) faster.
  * **Shared state**. Many things that happen in Group Income, such as processing
    contract events, result in a state that affects all individual browsing
    contexts a user may have open (i.e., all tabs or windows). By processing
    this common state and broadcasting the result, there can be fewer
    opportunities for inconsistencies across browsing contexts. Furthermore,
    processing these events in a dedicated service worker improves performance
    because events are processed only once, instead of many times.
  * **Notifications**. Implementing a proper PWA with supports for notifications
    requires processing events as they happen, even if there is no current
    browsing context with Group Income. The only way to do this is by using a
    service worker that has access to the contract state (so that it can decide
    when a notificaton is relevant).

### Constraints of service workers

To understand some of the decisions made, it's important to understand how
web (service) workers function and some of their constraints.

Web workers run in an entirely different context from the browsing context, and
by default they don't have access to the browsing context (and vice versa). This
means that, for example, `self.foo = 'bar'` executed in a browsing context will
not make the global variable `foo` available in a web worker, and, conversely,
the same code executing in a web worker will not make it available in the
browsing context.

Instead, communication between web workers and browsing contexts is asynchronous
and event-driven. The most relevant web APIs for how this communication happens
are `postMessage`, the `message` event listeners (e.g., `onmessage`) and the
`structuredClone` function.

Following up the previous example, if a web worker wanted to communicate to the
browsing context that `foo` should take the value of `bar`, the process is more
involved than just `self.foo = 'bar'`. Instead, the process looks more or less
like this:

  1. The browsing context sets up an event listener for the `message` event on
     the worker.
  2. The worker sends a message event with the new value. Under the hood,
     message data will be processed using the structure clone algorithm (i.e.,
     `structuredClone`).
  3. The event listener receives and processes the event.

#### Example

```js
console.log('foo is', self.foo)
// > foo is undefined
const worker = new Worker('data:text/javascript,' + encodeURIComponent(`
  // The worker will send a message to the browsing context
  postMessage(['foo', 'bar'])
`))
worker.onmessage = function (event) {
  const [key, value] = event.data
  self[key] = value
}
setTimeout(() => {
  console.log('foo is', self.foo)
  // > foo is bar
}, 100)
```

#### The structured clone algorithm

Explaining how the structured clone algorithm works in detail is complex.
However, the short overview is that a _very close approximation_ is the
equivalent of JSON. I.e., it's something like this:

```js
function structuredClone (data) {
  return JSON.parse(JSON.stringify(data))
}
```

Although the structured data clone algorithm supports more types than plain
JSON, the data types supported are predefined, and, importantly, functions and
custom object types are _not_ supported. The `serdes` library in
`shared/domains/chelonia` is a collection of functions to augment the
capabilities of the structured clone algorithm.

#### Specifics about Service Workers

Unlike other types of web workers, there can only be, at most, a single active
service worker per page. A single service worker can be shared across multiple
browsing contexts (e.g., if the user opens many tabs with Group Income, they
will all share the same service worker) or even no browsing contexts (e.g., if
the user closes all of the Group Income tabs, the service worker can continue
running in the background).

This means that there are two ways that service workers can send messages to
open tabs. One of them, is they can send a message to a specific tab (or to
different tabs, one by one). The other way is sending a _broadcast message_,
which is sent to all tabs at once.

### Data locality

In Group Income, as mentioned, some operations run in the service worker while
some other operations run in the browsing context.

All the operations related to Chelonia run in the service worker. This means
that the service worker 'owns' the Chelonia instance and is responsible for
things such as setting up Chelonia, sending (writing) actions to contracts, and
receiving and processing events that happen in a contract. The updated state is
then sent to each open browsing context, which keeps a local copy and presents
updates to users.

As a result, the app state is divided. There is a 'shared state' that the
service worker is responsible and authoritative for, and a 'local state' that
each browsing context is responsible and authoritative for.

#### Shared state

The shared state comprises all of the Chelonia state, plus a few additional keys,
such as `loggedIn` (containing the currently logged in user).

When the shared state changes, the service worker broadcasts an event to let
each browsing context know and react to this change. For example, when a user
joins a group, each tab needs to know of this so that the new group appears in
the presentation of the app.

#### Local state

The local state comprises all of the state needed to _render a visual presentation of the app_
(i.e., producing DOM tree and associated interactive handlers).

Currently, this local state contains a copy of the shared state, but this copy
is non-authoritative, meaning that it should only be changed when an event from
the service worker is received to this effect.

In addition, the local state contains other things that are important for
presenting the app, such as user preferences, whether the tab is active or idle,
etc. This information could be derived from the shared state or it could be
entirely independent.

**Crucially, this local state is not synced across browsing contexts**. When the
local state changes, other tabs are not made aware of this fact. This allows the
app to be open in different tabs, where each tab could be open in a different
group or chatroom.

#### Keeping the shared part of the local state in sync

When the shared state changes, the service worker broadcasts an event, as
discussed. Besides this, the service worker broadcasts a range of events to tabs
other than simply 'the state changed'. For example, the `LOGIN` and `LOGOUT`
events are other events that are conveyed to let individual tabs know that the
current user session changed. In general terms, it can be said that Group Income
(the app) is event-driven as a consequence of using a service worker architecture,
and that presentation depends on correctly sending and processing events.

## Login process

Since logging in and out occurs in the browsing context as a result of user
interaction, it's special in the sense that it's a 'shared state' event that
originates in the browsing context. This makes the process harder to picture
than most other things, where there is a clearer hierarchy.

In addition, there are two entry points to the log in process: one that happens
as a result of an explicit user action (e.g., logging in) and another one that
happens when the app is loaded in a new tab (i.e., loading Group Income in a new
tab). The latter is so that new tabs can re-use an existing session and users
are not prompted to log in again when they have already done so in the past.

### Login events

#### Overview

  * `LOGIN`: The `LOGIN` event represents an active login intent, which is to
   say, it represents that there is an active login process, which may either
   fail or succeed. This event can originate in the service worker (when
   establishing a new session) or in a local browsing context (when there is
   an active sesion).
  * `LOGIN_COMPLETE`: The `LOGIN_COMPLETE` is emitted following a `LOGIN` event
  and signifies that the login process completed successfully. This event is
  only local, which means that it doesn't originate on the service worker. Its
  purpose is to let the app know that an active user session exists and has been
  initialised.
  * `LOGIN_ERROR`: The `LOGIN_ERROR` is similar to the `LOGIN_COMPLETE` error,
  except that it means that the login process did _not_ complete successfully,
  and, as a result, there is no active user session.
  * `LOGOUT`: The `LOGOUT` event represents the end of an active user session.
  This event originates in the service worker.

#### `LOGIN` event

##### Triggers

###### `actions/identity.js`

The `LOGIN` event is emitted in the service worker after calling
`'gi.actions/identity/login'`. Its purpose is to let all open tabs that a new
active session exists.

Note that there is no corresponding `LOGIN_ERROR` emitted here, because an error
would be thrown directly for the caller to handler. The reason for this is that,
while all tabs need to know that a user recently logged in, only the caller
needs to know when it logging in fails (for example, to display feedback in the
login form)

###### `app/identity.js`

Exceptionally, the `LOGIN` event can also be emitted locally in `app/identity.js`.
This happens when _there already is an active session_ and
`'gi.actions/identity/login'` is not called (i.e., when opening a new tab of
Group Income on a device where the user has already logged in). The purpose of
emitting this event is to trigger the various handlers that set up the app state
based on an existing session, thus reusing the same logic as for then this event
originates in `actions/identity.js`.

##### Handlers

###### `app/identity.js`

The handler in `app/identity.js` will react to a `LOGIN` event and load a copy of
the app local state from IndexedDB. Once this is done, this handler will emit
either of `LOGIN_COMPLETE` or `LOGIN_ERROR`, depending on whether an error
occurred or not.

###### `pages/Join.vue`

Since one can start the process of joining a group without an active session,
the handlers here handle logging in or signing up as part of joining a group.

#### `LOGIN_COMPLETE` and `LOGIN_ERROR`

##### Triggers

###### `app/identity.js`

The `LOGIN_COMPLETE` (or `LOGIN_ERROR`) event is emitted in the handler of the
`LOGIN` event. The event is emitted after successfully (or, in the case of
`LOGIN_ERROR`, unsuccessfully) restoring the state after a login attempt.

##### Handlers

###### `app/identity.js`

The `gi.app/identity/login` selector sets up event listeners for
`LOGIN_COMPLETE` and `LOGIN_ERROR` and returns after either of these is
received.

###### `setupChelonia.js`

An event listener for `LOGIN_COMPLETE` loads KV values after a successful login
session and saves Chelonia state into IndexedDB. This enables session
persistence.

###### `main.js`

The `LOGIN_ERROR` event handler removes the loading animation.

The `LOGIN_COMPLETE` event handler finishes setting up the global app state.

#### `LOGOUT`
##### Triggers

###### `actions/identity.js`

The `LOGOUT` event is emitted right at the end of the
`gi.actions/identity/logout` selector to signal that the current session has
ended.

##### Handlers

###### `app/identity.js`

This event listener unloads persistent actions (currently commented out).

###### `setupChelonia.js`

This event listener resets Chelonia and removes Chelonia state from IndexedDB.

###### `main.js`

This event listener sets up global app state related to there being no active
session.

###### `state.js`

This event listener (working in conjunction with a filter on the
`gi.app/identity/logout` selector) is used to determine whether a logout process
is currently in progress. If there's an ongoing logout process, session state
is not regularly persisted to IndexedDB like it normally would be.

###### `actions/group.js`

This event listener is set up during the course of an ongoing group joining
process (i.e., a call to `gi.actions/group/join`) for the purpose of cleaning
up other event listeners set up connected to joining a group.

###### `settings/vuexModule.js`

This event listener restores the Vuex module state to its initial value after
logging out.

### Example login and log out flows

#### Example 1: New session

1. `[browsing context]` `gi.app/identity/login` is called with a password. This
   places a call in the `APP-LOGIN` queue (so that login and logout actions
   happen sequentially and don't interfere with one another).
2. `[browsing context]` The queued call (in `APP-LOGIN`) is executed. This will:
   1. Derive the CEK from the password
   2. Set up event listeners for `LOGIN_COMPLETE` and `LOGIN_ERROR`
   3. Call and wait for 'gi.actions/identity/login'
   4. Wait for either of `LOGIN_COMPLETE` or `LOGIN_ERROR`.
3. `[sw]` `gi.actions/identity/login` will place a call in the
   `ACTIONS-LOGIN` queue.
4. `[sw]` The queued call (in `ACTIONS-LOGIN`) is executed. This will:
   1. Reset Chelonia state
   2. Retain or sync the identity contract (depending on whether it's a fresh
      session or an older savedsession being restored).
   3. Emit the `LOGIN` event.
   4. Sync existing groups and contracts as well as call `gi.actions/group/join`
      for groups that may be in pending status.
5. `[browsing context]` The `LOGIN` event is handled. This sets the state for
   that user and the `LOGIN_COMPLETE` is emitted.
6. `[browsing context]` The `LOGIN_COMPLETE` is processed and all remaining
   global state associated with an active sesison is set up. Now, the call made
   to `gi.app/identity/login` will also return.
7. `[service worker]` The `LOGIN_COMPLETE` event is propagatd to the service
   worker, which now saves Chelonia state into IndexedDB.

#### Example 2: New tab with an active session

1. `[browsing context]` `gi.app/identity/login` is called without a password.
   This places a call in the `APP-LOGIN` queue (so that login and logout actions
   happen sequentially and don't interfere with one another).
2. `[browsing context]` The queued call (in `APP-LOGIN`) is executed. This will:
   1. Set up event listeners for `LOGIN_COMPLETE` and `LOGIN_ERROR`
   2. Emit the `LOGIN` event.
   3. Wait for either of `LOGIN_COMPLETE` or `LOGIN_ERROR`.
3. `[browsing context]` The `LOGIN` event is handled. This sets the state for
   that user and the `LOGIN_COMPLETE` is emitted.
4. `[browsing context]` The `LOGIN_COMPLETE` is processed and all remaining
   global state associated with an active sesison is set up. Now, the call made
   to `gi.app/identity/login` will also return.
