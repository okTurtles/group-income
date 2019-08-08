# Modal System

We have a centralized modal architecture. In other words, We only have 1 main dynamic modal that changes its content based on the current open modal by using `:is` Vue feature.

Then we can open/close any modal from anywhere in the app using `sbp()`.

Let's see a real working example: **the Login modal**:

### How to open a modal

From anywhere in the App we can open any modal by using the `sbp` event `LOAD_MODAL` with the Vue Component that contains the modal Content

```html
<!-- NavBar.vue -->
<template>
  <button @click='openLoginModal'>Sign up</button>
</template>

<script>
import sbp from '~/shared/sbp.js'
import { LOAD_MODAL } from '@utils/events.js'

openLoginModal () {
  sbp('okTurtles.events/emit', LOAD_MODAL, 'LoginModal')
  // or pass an object with 'name' and 'subfolder' properties relative to containers folder // TODO: explain this better?
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

### The `Modal.vue`

The `<modal />` is imported at `simple/index.html` at the bottom of the DOM.

Its content use <modal-template /> and is dynamically loaded [(Know more about Vue Dynamic Components)](https://vuejs.org/v2/api/#is). The modal use `sbp` events `LOAD_MODAL` and `CLOSE_MODAL`.


### The `<modal-template />`
A Modal that accepts:
- scoped slots title, subTitle and footer and default slot.

### The `<modal-base-template />`
A full-width Modal with just `transition` as wrapper. Note that this Modal has "zoom" transition instead of "slide-left" as in ModalTemplate.

---

Caught a mistake or want to contribute to the documentation? Edit this page on GitHub!
