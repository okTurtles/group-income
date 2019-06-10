# Style Guide

Please read all the sections below before writing a single line of code.

- **[JavaScript Style Guide](#javascript-style-guide)**
- **[Vue.js Style Guide](#vuejs-style-guide)**
- **[CSS Style Guide](#css-style-guide)**
    - [CSS Conventions](#css-conventions)
- **[Group Income Data Model Rules](#group-income-data-model-rules)**
- **[SBP Paradigm](#sbp) (Soon!)**

## JavaScript Style Guide

While our build system should automatically detect most deviations from [JS Standard](https://github.com/standard/standard), it might not catch all (especially in `.vue` files).

If you notice any files not properly linted by `standard`, this means there's a bug, and you're welcome to help fix it!

_It is still on you to ensure your code conforms to the `standard` spec, whether or not the linter catches everything._

## Vue.js Style Guide

Since this is a Vue.js project, any pull requests **must** follow *Priority A* rules mentioned in the [Vue.js Style Guide](https://vuejs.org/v2/style-guide/), and *should* follow the *Priority B* rules. Please take the time to read at least those two sections.

## CSS Style Guide
TODO: complete style guide

Use l- for layout components and c- for anything inside a component. It's just easier to understand where to fine the code and inderstand the dependencies.
All other classes are globals and should be kept to a minimum for simplicity and avoid interdependencies problems.

In general, think simplicity and don't over ingenior.
It's easier to add style in a component and add few lines of code than trying to create the most generic css that create increasing complexity.
With design refinement the process should slowly reverse and we should see common pattern emerging naturally.

## Group Income Data Model Rules

Group Income adds additional rules for how to write `.vue` components.

These rules come out of many lessons learned. All new pull requests **must** follow these rules. The sections below first describe the Group Income data model, and then describe the actual rules in ["How to organize `data ()`"](#how-to-organize-data-).

_Note: some old code unfortunately does not follow these rules, and we encourage contributors to help clean it up so that it does._

### Overview

If you're familiar with Ethereum smart contracts, you'll be somewhat familiar with how Group Income structures its data, however, many of the terms you're familiar with will have slightly different meanings and implementations in Group Income.

For example, in Group Income, data is synchronized between users through "blockchains" and "smart contracts", but these chains and contracts have more in common with `git` than they do with Ethereum.

Here are the primary differences:

- In Group Income, "blockchains" _are_ smart contracts. Each contract is its own _private chain of events_ called a ***contract chain***.
- Each contract is identified by the hash of the transaction that created it, which is also the start of its contract chain.
- All contract chains created by Group Income are private and can only be accessed to by those authorized to. For example, a `GroupContract` can only be read and written to by current group members.
- Data is synchronized between clients through a central node. Each group member has the ability to turn their client into this coordinating node, but every group uses a single always-online node to transmit and sync changes to logs. There is no consensus process beyond this node because no consensus process is needed since everyone already trusts each other.

Since every contract represents a _log of events_, you can run through the _actions/events_ in the log to build up a _state_ for the contract object represented by that event log.

In Group Income, the client runs chains through [Vuex](https://vuex.vuejs.org/en/) to build up the application state via the `handleEvent()` function in `frontend/simple/state.js`.

There is a direct 1-to-1 mapping between the contract event logs, and Vuex mutations and actions. The contracts are defined in `shared/GIMessage.js`, and their Vuex mappings are defined in `frontend/simple/model/contracts/events.js`.

### Persistent State vs. Ephemeral State

There are two primary _kinds_ of state in Group Income:

- **Persistent state** refers primarily to the `Vuex` state that gets serialized to disk, and in general it also refers to everything that creates that state. This includes the contracts and the transactions that create them. In other words, _persistent state_ is the state that is at some point _sent over the Internet_, and it is the data that _persists_ between application launches.
  - When the application starts, it loads data from disk (via `localStorage`) into the Vuex store.
  - The state for every contract we're subscribed to exists as a unique [module](https://vuex.vuejs.org/en/modules.html) in Vuex, the key for which is the hash of the first transaction that created the contract.
  - Almost everything in the vuex state is serialized to disk to the local "database" (i.e. `localStorage`) so that it's available the next time the application starts.
  - Events for each contract we're subscribed to pass through the `handleEvent()` function in `state.js`. Whenever we (the client) send out a transaction that modifies the group state, we first send it to the server, and only update the Vuex state when the server echoes the transaction back to us (and then it gets processed like all the others by `handleEvent()`).
- **Ephemeral state** refers to everything else. Much of the data in Group Income does not need to be saved to disk or sent over the Internet. For example, none of the metadata related to validating forms needs to be saved to disk or kept around between application launches. And although some state might exist in contract chains (for example, the URL to a profile picture), that does not mean Group Income will persist every contract a user interacts with.
  - The `latestContractState()` function in `state.js` should be used in situations where data from a contract chain is needed momentarily, but might not need to be saved forever. It will fetch all of the events in a contract and use them to build up a final state for that contract. For example, `latestContractState()` is used in `Join.vue` to show avatars for group members in a group the user is considering joining. Since the user might decide not to join a group, we do not subscribe to the `IdentityContract`s of any of those users and do not persist any of that information (until the user actually joins the group).
  - All ephemeral state should be stored in a Vue component's `data ()` section. There is almost no exception to this.

### How to organize `data ()`

Having components keep track of their own state is considered poor practice. It makes the application difficult to reason about and maintain.

Therefore, components should be "purely functional" in the sense that virtually all of their state is derived from the vuex store, computed properties based on that store, or props that are passed in to the component from a parent component.

There are **three exceptions**, and all of them have to do with different types of *ephemeral state* (see above).

**The object returned by `data ()` should have only these keys:**

1. **`form`** — form validation metadata for [`vuelidate`](https://github.com/okTurtles/group-income-simple/issues/334).
2. **`config`** — some Vue.js components require bindings to config data (for example, the `sliderConfig` for `<vue-slider>` in `TimeTravel.vue` and `steps` for `helpers/StepAssistant.js` in `CreateGroup.vue` or [Vue Provide](https://vuejs.org/v2/api/#provide-inject)).
3. **`ephemeral`** — any data we might not care to save beyond the life of the view (unless some other action is performed) should be placed here. There shouldn't be much that fits in this category (as, for example, most error handling stuff should be handled by `form` and in the `<template>` section). However, it might be useful to cache some data temporarily (like a profile picture or URL) here.

Remember: if you can use a computed property based on the vuex store, it means you probably should.

## SBP

Virtually everything in this project is [going to be converted](https://github.com/okTurtles/group-income-simple/issues/295) to SBP ("selector-based programming", see `shared/sbp.js`).

Details about SBP will be written in a blog post soon. In the meantime, you are encouraged to adopt this paradigm wherever possible for your own code.

Search the project for `sbp(` for examples, and speak with @taoeffect about it before diving in (at least until the docs for SBP are still waiting to be written).

_SBP is the greatest thing to happen to programming since computers were invented! :D->-<_

---

Caught a mistake or want to contribute to the documentation? Edit this page on GitHub!
