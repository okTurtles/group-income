# Information Flow

It's recommended you understand the [basics of `sbp`](Style-Guide.md#sbp) before moving on because everything that will come next, works around it.

The simplest way to explain this is by starting to explain a couple of functions you'll see together a lot of times across the project. These two functions are the core to make any logical change at Group Income:

```js
// Example: Update a group minimum income to 150

// 1. Message - Create a set of data to be later processed
const message = await sbp(
  'gi.contracts/group/updateSettings/create',
  { mincomeAmount: 150 },
  currentGroupId
)

// 2. Mutation - Send the message to the server and update the store (Vuex) accordingly
await sbp('backend/publishLogEntry', message)
```

Now, let's see in more detail what really happens in each function:

##### 1. Create a Message
First, we need to create a message using a selector under _'gi.contracts'_ domain.
When we call the first `sbp` function we need to pass 3 parameters:
- `selector`: For example, _'gi.contracts/group/updateSettings/create'_ has a [_domain_ _gi.contracts/_](../frontend/model/contracts/group.js) based on a [Contract](../frontend/model/Contract.js) which will process the action _group/updateSettings/create_.
- `data`: a set of information passed to the action when it's processed.
- `contractId`: the current group hash where the action should take effect on.

The `gi.contract/*/create` selector will create and return a [GIMessage](../shared/GIMessage.js) (an event) based on the parameters passed.

> **Note:** _Contracts_ can be thought of as *distributed classes*. When you create a contract, you create an *instance*, similarly to how instances in [OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) can be created. Contracts have an internal state that is updated by *actions*. A contract can be a group, a user profile (identity), or any other thing. All current contracts can be found at [`model/contacts/`](../frontend/model/contracts/).

##### 2. Perform a Mutation

With a `GIMessage` created in the step before, we now need to send it to the server:

```js
await sbp('backend/publishLogEntry', message)
```

###### 2.1 Communication with the server (database)

GIMessages ("events") are used to represent either the creation of a contract, or an action performed upon that contract. When a client sends these messages to the server, they are sent back to everyone who is subscribed to that contract. Then, upon receiving a message/event, each client uses it to update their local copy of the contract state. That's all done under the selector _'backend/publishLogEntry'_.

The sbp selector `'backend/publishLogEntry'` sends a POST request to the server with the _message_ serialized. The server will, through a _websocket_, return the _message_ back to the client, deserializes and dispatches it to Vuex.

Then, [the dispatch event is handled by Vuex at model/state.js](../frontend/model/state.js#L302). There, the event is verified and, if all goes right, the message is processed through `sbp`, with the given `selector` (the action), the state based on the `contractId` and the `data`.

###### 2.1 Vuex reaction

So far, you might wonder:

> _Where do I create a contract action? ('gi.contracts/group/updateSettings')_.

All actions of a contract are in the contract definition. For example, the Group actions are created at [`contracts/group.js`](../frontend/model/contracts/group.js).

```js
'gi.contracts/group/updateSettings': {
  // Method to validate the received data type (FlowJS)
  validate: object,
  // Runs when the selector 'gi.contracts/group/updateSettings/process' is called
  // state: contractId's state
  // data: { mincomeAmount: 150 }
  // meta: /* Metadata - read note bellow */
  process (state, { data, meta }) {
    // Performs the needed mutation to Vuex state, in this case,
    // updates the given keys (mincomeAmount) with the new value (150).
    for (var key in data) {
      Vue.set(state.settings, key, data[key])
    }
  }
},
```

> **Note**: Metadata is only included when contracts define a metadata key in their contract definition. It includes information about the action, such as when it was created and who created it.

##### 3. Getting the latest changes of a _Contract_

We are almost there, the only question remaining is:

> _How do users know what Contracts should they subscribe to and where is that done?_

```js
  await sbp('state/enqueueContractSync', contractId)
```

`'state/enqueueContractSync'` is what's used to both subscribe to a contract as well as fetch the latest events from it.

(...WIP...)

When subscribed to a Contract, the user is updated each time an action there is called, even if the action wasn't triggered by the user itself. (TODO: Add link/reference to where this happens)

So you don't need to worry about this for now, it just works 🔮.


That's all for now! Feel free to dive deeply even more in the files mentioned so far and complement this docs with your discoveries.
