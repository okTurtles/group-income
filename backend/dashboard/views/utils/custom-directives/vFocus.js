import Vue from 'vue'

Vue.directive('focus', {
  inserted: (el, args) => {
    if (!args || args.value !== false) el.focus()
  }
})
