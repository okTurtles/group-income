import Vue from 'vue'
// Register a global custom directive called `v-focus`
Vue.directive('focus', {
  // When the bound element is inserted into the DOM...
  inserted: (el) => {
    // Focus the element
    setTimeout(() => {
      el.focus()
    }, 300) // Timeout is necessary to let the animation finish on the modal
  }
})
