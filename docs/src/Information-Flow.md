# Information Flow

It's recommended that you understand the [basics of `sbp`](https://github.com/okTurtles/sbp-js) before moving on because everything below relies on it.

In Group Income, we use a framework called [Chelonia](https://github.com/okTurtles/libcheloniajs) for building software out of something called "contract chains" (if you're familiar with how smart contracts in Ethereum work, this will make more sense to you).

For more information, watch these two talks:

- 🎦 [**Shelter Protocol Introduction by Greg Slepak @ DWebCamp2023**](https://odysee.com/@okTurtles:e/shelter-protocol-introduction-by-greg:5)
- 🎦 [**Chelonia End-to-End Encryption For Every App @ Internet Archive**](https://archive.org/details/dweb-weekend-conference-2025-day-2-all-presentations-playlist/06+-+Greg+Slepak+-+Chelonia+End-to-End+Encryption+For+Every+App+-+DWeb+Conference+Day+2.mp4)

A contract chain is an immutable linked-list of events. We use this sequence of events to build up a state. For example, in Group Income we have a "group contract" that represents group-related data and events. The first event in the contract defines and registers the contract itself, in this case, the specific instance of a group. Each subsequent event represents an action that happens within the group.

So for example, if we want to update the settings of a group, we do this:

```js
// Example: Update a group minimum income to 150

await sbp('gi.actions/group/updateSettings', {
  contractID: this.currentGroupId, data: { mincomeAmount: 150 }
})
```

This action accomplishes two things at once:

1. It creates the event — an *action* — and wraps it in a [`SPMessage`](https://github.com/okTurtles/libcheloniajs/blob/main/src/SPMessage.ts) object.
2. It sends this `SPMessage` to the server - appending it to the contract `contractID` (in this case, the current group we're in)

> _Contracts_ can be thought of as *distributed classes*. When you create a contract, you create an *instance*, similarly to how instances in [OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) can be created. Contracts have an internal state that is updated by *actions*. A contract can be a group, a user profile (identity), or any other thing. All current contracts can be found at [`frontend/model/contracts/`](../../frontend/model/contracts/).

### Version controlled

All contracts are version controlled by "pinning". This means that any time any contract logic changes, a snapshot of these changes must be made before the next release of the app using the `grunt pin` command. This creates a complete copy the contract that gets frozen in time, so that any events that are processed using that contract are always processed using the same code no matter when they are processed. This ensures that all clients are able to build up the same state even in the face of changing code.

### Data Representation

`SPMessages`, and in fact all data in Group Income, is referenced by its hash, and on the server, stored in a file with a file name that is equal to that hash. Retrieving that data then becomes a simple hash lookup, similar to how IPFS and the Dat Protocol work, except much simpler (no [DHT](https://en.wikipedia.org/wiki/Distributed_hash_table) is used).

### Actions

All of the contract actions for all the contracts used in Group Income are defined in [`frontend/controller/actions/`](..frontend/controller/actions/).

The code in `frontend/controller/actions/*` is used for creating `SPMessages` to send to contracts, and it mirrors the actions that can be called on contracts that are defined in `frontend/model/conracts/*`.

### Client <-> Server Communication Details

When a client sends a `SPMessage` to a contract stored on the server, that message is sent back (via websockets) to everyone who is subscribed to that contract, including the client that sent the message. Upon receiving this message/event, each client uses it to update their local copy of the contract state, per the `process` function that is defined for that action. All of these `process` functions can be found in [`frontend/model/contracts/`](../../frontend/model/contracts/).

### Vuex Integration

In Group Income, we integrate our contract framework with Vuex, and the logic for that integration can be found in [`frontend/model/state.js`](../../frontend/model/state.js).

This allows the UI to be automatically updated whenever an action is sent to the contract. Chelonia also supports Vuex-like getters, that can be directly bound to the UI.

Contract state is updated by the `process` function inside of contract actions. Whenever this state is updated, those updates are propagated to the UI via Vuex.

> [!NOTE]
> In fact all of the `gi.actions` live in the service worker because all of Chelonia runs in the service worker. This prevents multiple instances of Chelonia from running when there are multiple tabs or windows of Group Income open. State is copied over from the service worker to each Vuex instance in every tab. Not every Chelonia app needs to behave this way, but Group Income does as it makes data corruption less likely to happen and also makes web push notifications work.

### The `process` function

When most data comes in from the server (whether by a manual sync or over the web socket after we're subscribed), it first passes through the contract's `process` function corresponding to the action that was sent.

In our example above, the name of the *contract action* generated by `sbp('gi.actions/group/updateSettings', ...)` is called `'gi.contracts/group/updateSettings'`, and its `process` function is defined in [`frontend/model/contracts/group.js`](../../frontend/model/contracts/group.js):

```js
'gi.contracts/group/updateSettings': {
  validate: objectMaybeOf({
    groupName: string,
    groupPicture: string,
    sharedValues: string,
    mincomeAmount: numberRange(Number.EPSILON, Number.MAX_VALUE),
    mincomeCurrency: string
  }),
  process ({ meta, data }, { state, getters }) {
    for (const key in data) {
      Vue.set(state.settings, key, data[key])
    }
  }
},
```

Process functions are only allowed to update the state for their corresponding contract, and do nothing else. They're not allowed to perform any side effects. For that, we have the `sideEffect` function.

> [!NOTE]
> Metadata is only included when contracts define a metadata key in their contract definition. It includes information about the action, such as when it was created and who created it.

### The `sideEffect` function

Anything that triggers other app behavior belongs in the `sideEffect` function. These functions are allowed to do anything **except** update contract state (they're like the inverse of the `process` function).

You can create side effects by implementing the `sideEffect` function, or by calling the special selector `<contractName>/pushSideEffect`. See `group.js` for examples of both patterns.

It's **very important** when writing side effects to understand that unlike contract methods (see next section) any events or selectors that they call that get propagated to the app are not version-controlled! This means that the implementation of those selectors in the app cannot change (or at the very least, must handle the same parameters forever). See [**Calls From Contracts**](./Calls-From-Contracts.md) for more details.

### Contract methods

In addition to an `actions` section, contracts can have `methods`. These are version-controlled blocks of code that can be called from within the contract for organizational purposes. It can be handy to have these for example when you have a process function that wants to decide at processing time whether or not to trigger some other code that might have side effects using the `*/pushSideEffect` selector.

Contract method selectors have this structure: `<contractName>/<methodName>`.

Here's an example from `group.js` of a contract method being queued up to be called by a process function:

```js
sbp('gi.contracts/group/pushSideEffect', contractID,
  ['gi.contracts/group/archivePayments', contractID, archivingPayments]
)
```

> [!NOTE]
> Side effects that are pushed onto the "side effect stack" using `pushSideEffect` get run *after* the `sideEffect` function, if it is defined.

### Subscribing to a contract

Chelonia implements _reference counting_ to automatically manage contract
subscriptions. When the reference count is positive, a contract subscription
is created, meaning that the contract will be synced and Chelonia will listen
for new updates. When the reference count drops to zero, the contract will be
automatically removed(*).

Subscribing to a contract and syncing all of its updates is done by calling `'chelonia/contract/retain'`:

For example:

```js
sbp('chelonia/contract/retain', contractID)

// OR wait until it finishes syncing:

await sbp('chelonia/contract/retain', contractID)
```

This will subscribe us to the contract and begin listening for new updates.

When the contract is no longer needed, you can call `'chelonia/contract/release'`.

For example:

```js
await sbp('chelonia/contract/release', contractID)
```

#### When to call `retain` and `release`

Normally, you should call `retain` each time an event is about to happen that
requires receiving updates for a contract. You should then call `release` when
that reason for subscribing no longer holds.

**IMPORTANT:** Each call to `release` must have a corresponding call to `retain`.
In other words, the reference count cannot be negative.

Three examples of this are:

  * **Writing to a contract.** Writing to a contract requires being subscribed
    to it, so you should call `retain` before sending an action to it. The
    contract can be released by calling `release` after the writes have completed.
  * **Subscribing to related contracts in side-effects.** A common use case for
    calling `retain` and `release` is when a contract is related to other
    contracts. For example, you could have users that can be members of different
    groups. Every time a user joins a group, you would call `retain` in the
    side-effect of that action, and then call `release` when the group membership
    ends.
  * **Logging a user in.** If your application has users that are represented by
    contracts, those contracts usually need to be subscribed during the life of
    a session. This would be an example where you would have a call to `retain`
    when the account is created and then there could be no `release` call.

#### Ephemeral reference counts

Chelonia maintains two different reference counts that you can directly control
using `retain` and `release`: ephemeral and non-ephemeral.

Non-ephemeral reference counts are stored in the root Chelonia state and are
meant to be persisted. In the examples above, the examples of subscribing to
related contracts and logging a user in would fall in this category. If Chelonia
is restarted, you want those references to have the same value.

On the other hand, _ephemeral_ reference counts work a differently. Those are
only stored in RAM and are meant to be used when restarting Chelonia should
_not_ restore those counts. The example of writing to a contract would be one
of those cases. If Chelonia is restarted (for example, because a user refreshes
the page) and you're in the middle of writing to a contract, you would not want
that reference to persist because you'd have no way of knowing you have to call
`release` afterwards, which would have the effect of that contract never being
removed.

All calls to `retain` and `release` use non-ephemeral references by default. To
use ephemeral references, pass an object with `{ ephemeral: true }` as the last
argument. Note that ephemeral `retain`s are paired with ephemeral `release`s,
and non-ephemeral `retain`s are paired with non-ephemeral `release`s (i.e.,
don't mix them).

For example,

```js
// NOTE: `retain` must be _outside_ of the `try` block and immediately followed
// by it. This ensures that if `release` is called if and only if `retain`
// succeeds.
await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
try {
  // do something
} finally {
  await sbp('chelonia/contract/release', contractID, { ephemeral: true })
}
```

#### `chelonia/contract/sync`

In addition to `retain` and `release`, there is another selector that's
relevant: `chelonia/contract/sync`. You use `sync` to force fetch the latest
state from the server, or to create a subscription if there is none (this is
useful when bootstrapping your app: you already have a state, but Chelonia
doesn't know you should be subscribed to a contract). `sync` doesn't affect
reference counts and you should always call `sync` on contracts that have at
least one refeence. This means that you need to, at some point, have called
`retain` on that contract first.

(...WIP...)

When subscribed to a Contract, the user is updated each time an action there is called, even if the action wasn't triggered by the user itself. (TODO: Add link/reference to where this happens)

So you don't need to worry about this for now, it just works 🔮.

(*) The actual mechanism is more involved than this, as there are some other
reasons to listen for contract updates. For example, if contracts use foreign
keys (meaning keys that are defined in other contracts), Chelonia may listen for
events in those other contracts to keep keys in sync.

That's all for now! Feel free to dive even more deeply in the files mentioned so far and complement these docs with your discoveries.

#### `referenceTally` helper function

Some advanced situations can happen when one contract is responsible for deciding whether or not to sync another contract.

A member could, for example, join and leave a chatroom multiple times. We wouldn't want to actually have them join and leave that chatroom multiple times every time they log in on a new computer when syncing the contract from scratch, so until contract snapshots are implemented, we have a utility function called `referenceTally` that is used by contracts like `group.js` and `chatroom.js` that can be called instead and it decides whether to eventually sync the contract or not based on how many `join`/`leave` pairs there are.
