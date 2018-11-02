# Style Guide

Please read all the sections below before writing a single line of code.

- **[JavaScript Style Guide](#javascript-style-guide)**
- **[Vue.js Style Guide](#vuejs-style-guide)**
- **[CSS Style Guide](#css-style-guide)**
    - [CSS Conventions](#css-conventions)
    - [How we use Bulma](#how-we-use-bulma)
- **[Group Income Data Model Rules](#group-income-data-model-rules)**
- **[SBP Paradigm](#sbp) (Soon!)**

## JavaScript Style Guide

While our build system should automatically detect most deviations from [JS Standard](https://github.com/standard/standard), it might not catch all (especially in `.vue` files).

If you notice any files not properly linted by `standard`, this means there's a bug, and you're welcome to help fix it!

_It is still on you to ensure your code conforms to the `standard` spec, whether or not the linter catches everything._

## Vue.js Style Guide

Since this is a Vue.js project, any pull requests **must** follow *Priority A* rules mentioned in the [Vue.js Style Guide](https://vuejs.org/v2/style-guide/), and *should* follow the *Priority B* rules. Please take the time to read at least those two sections.

## CSS Style Guide
We use [Bulma](https://bulma.io/documentation/overview/start/) framework and `SCSS`.

### CSS conventions
- Everything that can be solved with Bulma’s classes should be solved with them.

```html
<!-- These are Bulma classes -->
<h1 class="title is-2">Hello world</h1>
```

- Component specific classes should have `.c-` prefix and be written in the component’s `<style>` tag scoped. Keep this part as simple/little as possible.
- Any property that is part of Bulma's variables or [Group Income Theme](../frontend/simple/assets/sass/theme) (colors, spacings, breakpoints, typography, etc...) should be used as SCSS variable instead of a raw value.

```html
<template>
    <!-- We can easily distinguish Bulma classes from component's classes -->
    <h1 class="title is-2 has-text-centered c-title">Hello world</h1>
</template>

<style lang="scss" scoped>
.c-title {
    margin-bottom: $gi-spacer;

    @include tablet {
        margin-bottom: $gi-spacer-lg;
    }
}
</style>
```

- Global classes that aren't from Bulma should have `.gi-` prefix and be written in a global file like `assets/sass/_groupincome.scss`.

```html
<!-- We can easily distinguish Bulma classes from GI classes -->
<p class="is-size-5 gi-is-ellipsis">James Williams</h1>
```

- New Bulma modifiers classes should also have `.gi-` prefix. Know more by reading [How to override Bulma](#how-to-override-bulma).

### How we use Bulma
#### Understanding Bulma structure
We import Bulma by modules following [its folder structure](https://github.com/jgthms/bulma/tree/master/sass). Note that the order of the modules needs to be the same to Bulma's so all CSS works correctly


```scss
// bulma_overrides/_index.scss

@import 'utilities/index';
@import 'base/index';
@import 'elements/index';
@import 'components/index';
@import 'grid/index';
@import 'layout/index';
```

Each folder has an `_index.scss` with all its modules imports, even those that are not being used. Those modules are commented to better understand what we use and what we don't. When a module needs to be overridden, a unique file `[moduleName].scss` is created with the needed changes and imported at `_index.scss` file. Take as example the `title` import.

```scss
// bulma_overrides/elements/_index.scss

@import "../../node_modules/bulma/sass/elements/box";
@import "../../node_modules/bulma/sass/elements/button";
@import "../../node_modules/bulma/sass/elements/container";
@import "../../node_modules/bulma/sass/elements/content";
@import 'form';
@import "../../node_modules/bulma/sass/elements/icon";
@import "../../node_modules/bulma/sass/elements/image";
@import 'notification';
@import "../../node_modules/bulma/sass/elements/other";
// @import "../../node_modules/bulma/sass/elements/progress";
@import "../../node_modules/bulma/sass/elements/table";
@import "../../node_modules/bulma/sass/elements/tag";
@import 'title';
```

#### How to override Bulma

There are two ways of overriding Bulma:
- **SCSS Variables** - provided by Bulma's framework.
- **Classes** - Directly access Bulma's classes.

When overriding a module, start by checking the module's documentation and see if there's a SCSS variable that does the job. Add the variables **before** the module import.

```scss
$message-radius: 1px;

@import "../../node_modules/bulma/sass/components/message";
```

If there isn't a SCSS variable for that, the solution is to override directly the classes. Do that **after** the module import. When overriding a class, ask yourself if that should be modified everywhere by default or if it should be a new modifier.

If it's a new modifier, add `.gi-` prefix. That brings at least 2 main benefits:
- Easily understand if that code is Bulma's or ours.
- Prevent Bulma's naming conflicts with our code on future updates.

Let's see an example:

```scss
$message-radius: 1px;

@import "../../node_modules/bulma/sass/components/message";

.message-body {
  // The default `border-width` value is `0 0 0 3px`.
  // We want it to be `1px` everywhere, so we add a new modifier:
  border-width: 1px;

  // The default border-style is solid,
  // We want to dashed it just on a particular view, so we add a new modifier:
  &.gi-is-unfilled {
    border-style: dashed
  }
}
```

```html
<!-- We can easily distinguish our code from Bulma's -->
<div class="message-body gi-is-unfilled"> ... </div>
```

#### Bulma's documentation

Bulma sometimes changes *significantly*. Therefore it's important:

- To access the correct documentation for the version of Bulma that we're using. (Check `package.json`, and then visit the version-specific docs.
- **Never update Bulma "just because"!** Always create an issue to update Bulma first, and then create a single unique Pull Request only for that issue. You will have to verify and fix any UI-differences that might occur. Sometimes Bulma will change its API (remove/change classes, styles, variables, etc..). You must identify and fix all differences.

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
