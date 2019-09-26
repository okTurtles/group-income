# Information Flow

It's recommended you understand the [basics of `sbp`](Style-Guide.md#sbp) before moving on because everything that will come next, works around it.

The simplest way to explain this is by starting to explain a couple of functions you'll see together a lot of times across the project. These two functions are the core to make any logical change at Group Income:

```js
// Example: Update a group minimum income to 150

// 1. Message - Create a set of data to be later processed
const message = await sbp(
  'gi.contracts/group/updateSettings/create',
  { incomeProvided: 150 },
  currentGroupId
)

// 2. Mutation - Send the message to the server and update the store (Vuex) accordingly
await sbp('backend/publishLogEntry', message)
```

Now, let me explain in more detail what really happens in each function:

##### 1. Create a Message

The SBP selector [_domain_ `gi.contracts/`](../frontend/model/contracts/group.js) is based on a [common Contract](../frontend/model/Contract.js). Each action (ex: `group/updateSettings`) expects 2 arguments: the `data` and `contractId`.
- `data`: an object passed to the action when is processed.
- `contractId`: the current group hash where the action should take effect on.

This group action creates and returns a [GIMessage](../shared/GIMessage.js) based on the information passed (`data` and `contractId`).

> **Note:** A _Contract_ is a set of information with a specific structure where the client can subscribe to. It can be a group, a user profile (identity), the mailbox or any other thing. All current contracts can be found at [`model/contacts/`](../frontend/model/contracts/group.js).

##### 2. Perform a Mutation

With this new message, we need to send it to the server...

```js
await sbp('backend/publishLogEntry', message)
```

###### 2.1 Communication with the server (database)

Long story short, the sbp selector `'backend/publishLogEntry'` sends a POST request to the server with the _message_ serialized. The server, eventually, through a _websocket_, returns the _message_ back to the client, deserializes and dispatches it to Vuex.

Then, [the dispatch event is handled by Vuex at model/state.js](../frontend/model/state.js#L302). There, the event is verified and, if all goes right, the message is processed through `sbp`, with the given `selector` (the action), the state based on the `contractId` and the `data`.

###### 2.1 Vuex reaction

So far, you might wonder:

> _Where do I create a sbp contract action? ('gi.contracts/group/updateSettings')_.

All actions of a contract are created where the contract is created. In this specific contract (Group), at [`contracts/group.js`](../frontend/model/contracts/group.js).

```js
'gi.contracts/group/updateSettings': {
  // Method to validate the received data type (FlowJS)
  validate: object,
  // Runs when the selector is processed
  // state: contractId's state
  // data: { incomeProvided: 150 }
  // meta: /* read note bellow */
  process (state, { data, meta }) {
    // Performs the needed mutation to Vuex state, in this case,
    // updates the given keys (incomeProvided) with the new value (150).
    for (var key in data) {
      Vue.set(state.settings, key, data[key])
    }
  }
},
```

> **Note**: `meta` is included as part of the 2nd parameter of any _Contract_ action. It includes information about the action, such as when it was created and who created it.

##### 3. Getting the latest changes of a _Contract_

We are almost there, the only question remaining is:

> _How do users know what Contracts should they subscribe to and where is that done?_

Subscribing to a new Contract it's already done underneath during `backend/publishLogEntry`. (you can look for `registerContract` mutation in the project)

When subscribed to a Contract, the user is updated each time an action there is called, even if the action wasn't triggered by the user itself. (TODO: Add link/reference to where this happens)

So you don't need to worry about this for now, it just works 🔮.


That's all for now! Feel free to dive deeply even more in the files mentioned so far and complement this docs with your discoveries.
