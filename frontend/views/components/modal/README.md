# Modal System

TODO: Replace mixin functionality with vuejs 2-3 functional API is out

We have a centralized modal architecture. In other words, We only have 1 main dynamic modal that changes its content based on the current open modal by using `:is` Vue feature.

Then we can open/close any modal from anywhere in the app using `sbp()`.

Let's see a real working example: **the Login modal**:

### How to open a modal

From anywhere in the App we can open any modal by using the `sbp` event `OPEN_MODAL` with the Vue Component that contains the modal Content

```html
<!-- NavBar.vue -->
<template>
  <button @click='openLoginModal'>Sign up</button>
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'

openLoginModal () {
  sbp('okTurtles.events/emit', OPEN_MODAL, 'LoginModal')
  // or pass an object with 'name' and 'subfolder' properties relative to containers folder // TODO: explain this better?
}
</script>
```

### How to close a modal
To close the modal we nered to access directly the component instead of using event to avoid closing other openned modal

```js
// LoginModal.vue

closeModal () {
  this.$refs.modal.close()
}
```

There is differrent way of closing the modal which can be confusing.
Here is a schema that help to understand the complicated process:

1) Click on closing buttons or background:
- ModalClose [$emit("close")] to parent ModalBaseTemplate or ModalTemplate
- close action is call from mixin (that need to be replaced with functionnal API)
- The modal is closed by a boolean
- After the animation is done, unload event is called
- sbp('okTurtles.events/emit', CLOSE_MODAL) is called from ModalMixin
- unloadModal function is then call from Modal.vue that remove either content or subcontent
- we set a temporary variable to avoid changes on url
- Then we update the url

2) Direct change of the url (either by back next of change in then search bar)
- Modal.vue watch for changes
- unloadModal function is then call from Modal.vue that remove either content or subcontent

### The `Modal.vue`

The `<modal />` is imported at `simple/index.html` at the bottom of the DOM.

Its content use <modal-template /> and is dynamically loaded [(Know more about Vue Dynamic Components)](https://vuejs.org/v2/api/#is). The modal use `sbp` events `OPEN_MODAL` and `CLOSE_MODAL`.


### The `<modal-template />`
A Modal that accepts:
- scoped slots title, subTitle and footer and default slot.

### The `<modal-base-template />`
A full-width Modal with just `transition` as wrapper. Note that this Modal has "zoom" transition instead of "slide-left" as in ModalTemplate.

---

Caught a mistake or want to contribute to the documentation? Edit this page on GitHub!

### The `Prompt`
To call a prompt with yes / no question we need to call sbp with this format:

```js
const boolYesOrNo = await sbp('gi.ui/prompt', {
  question: L('Would you like fresh tacos?'),
  heading: L('Update info'),
  yesButton: L('Yes'),
  noButton: L('No')
})

if (boolYesOrNo) {
  // user said yes
} else {
  // user said no
}
```