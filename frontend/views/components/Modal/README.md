# Modal System

We have a centralized modal architecture. In other words, We only have 1 main dynamic modal that changes its content based on the current open modal by using `:is` Vue feature.

Then we can easily open/close any modal from anywhere in the app using `sbp()`.

Let's see a real example working: **the Login modal**:

### How to open a modal

From anywhere in the App we can open any modal by using the `sbp` event `LOAD_MODAL` with the Vue Component that contains the modal Content

```html
<!-- NavBar.vue -->
<template>
  <button @click="openLoginModal">Sign up</button>
</template>

<script>
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL } from '@utils/events.js'

openLoginModal () {
  sbp('okTurtles.events/emit', LOAD_MODAL, 'LoginModal')
  // or pass an object with 'name' and 'subfolder' properties relative to containers folder
}
</script>
```

### How to close a modal
In the same way we can also close the modal by using the event `CLOSE_MODAL`:

```js
// LoginModal.vue

closeModal () {
  sbp('okTurtles.events/emit', CLOSE_MODAL)
}
```

### The `<modal />`

The `<modal />` is imported at `simple/index.html` at the bottom of the DOM.

Its content use <modal-template /> and is dynamically loaded [(Know more about Vue Dynamic Components)](https://vuejs.org/v2/api/#is). The modal use `sbp` events `LOAD_MODAL` and `CLOSE_MODAL`.

---

Caught a mistake or want to contribute to the documentation? Edit this page on GitHub!
