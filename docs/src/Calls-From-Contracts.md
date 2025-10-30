# Calling Into the App From Contracts

In Chelonia, it's very important to understand what code can be modified and what code shouldn't be modified after it's written.

As mentioned in [Information Flow.md](./Information-Flow.md), contracts are versioned by pinning them. This means it's safe to modify them as much as you'd like.

Likewise, it's safe to modify most frontend UI code as much as you like.

Problems can occur, however, when modifying code that lives outside of the versioned contracts but gets called by them.

## Understanding The Problem

Let's say you have a contract with this series of events:

```
A -> B -> C -> D
```

Event `A`, through a side effect, calls out to the frontend using one of the `gi.actions/*` selectors that live in `frontend/controller/actions`.

Event `B` emits an event using `okTurtles.events` that gets propagated to the frontend.

And event `C` calls a function `periodStampsForDate()` that comes from `frontend/model/contracts/shared/time.js`.

All three of these scenarios can lead to problems if any of that code changes.

Remember, contract code gets snapshotted and frozen in time through contract pinning. So any changes to code that contracts uses won't be visible to that old frozen-in-time contract code. Meanwhile the frontend code only lives in the "present". Whatever that code happens to do in the present is what it does. So if a contract triggers some of that code, and that code has been modified since that contract was created, problems could occur if the new version of that code behaves in a different way than how it used to.

## App Actions And Events

Events `A` and `B` in our example are essentially the same problem.

For `A`, the contract could be calling a selector like `'gi.actions/group/join'`. The definition of this selector is in `frontend/controller/actions/group.js`, and this code runs inside of the service worker. Because it is not version controlled through pinning, it must accept the same parameters for life, and behave in essentially the same way for all time, so that if it's called by an old version of the contract it will still work as expected.

This selector is allowed to be called because when Chelonia is setup via `'chelonia/configure'` (in `frontend/setupChelonia.js`), is included in the `allowedSelectors` configuration. These are selectors that are allowed to be called from contracts. Their invocation is allowed to the leave the contract sandbox.

Likewise, Group Income allows the entire `'okTurtles.events'` domain to be called from contracts (via `allowedDomains`). This means contracts can emit any event that Group Income supports. And that in turn means that any events that are triggered by contracts must have event handlers in the app that will forever take the same parameters.

So for example, `group.js` emits the `JOINED_GROUP` event like so:

```js
sbp('okTurtles.events/emit', JOINED_GROUP, { identityContractID: userID, groupContractID: contractID })
```

That means this handler in `frontend/controller/app/group.js` cannot ever change its parameters and must essentially behave the same way forever:

```js
// handle incoming group-related events that are sent from the service worker
sbp('okTurtles.events/on', JOINED_GROUP, ({ identityContractID, groupContractID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  // ...
```

Note the comment says the event comes from the service worker. This is true because Chelonia is being run in the service worker, and the contracts run inside of a sandbox within Chelonia.

## Shared Functions

The final example we have are functions that are "shared" by both the frontend logic and the contract logic.

This code lives under the `frontend/model/contracts/shared` folder and includes various logic for dealing with payment distributions, distribution timestamps, and currencies.

This code is actually safer to modify because it's raw functions, not selectors that get dynamically propagated out of the contract sandbox. Contracts will only ever call the version of these functions that they had access to at the time.

For example, if you simply want to display some text to the user in a notification, you might call the `displayWithCurrency` function inside of `currencies.js`. If a contract is calling this function, it might be doing it to format a message that's passed to the frontend to display to the user. It can therefore be safe to modify `displayWithCurrency` to slightly change how currencies are displayed, and if you do that here's what might happen:

- The user might see an old-style formatted currency message when syncing old messages. For example, they might see a notification that says `$1000`
- Other parts of the app might display a new-style formatted message. Using our example, they might see `$1,000` instead of `$1000`.

Overall this type of inconsistency isn't a big deal and nothing should break.

You should give some thought to modifying shared functions, but it's much safer to modify them than modifying selectors that get called by contract side effects, and the reason is because shared functions get pulled into the contracts via contract pinning, whereas the implementation of selectors that get called out from the sandbox are never pulled in to the frozen/pinned contract code.
