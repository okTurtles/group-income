import Vue from 'vue'

// Register a global custom directive called `v-error`
// to automatically display vuelidate error messages

Vue.directive('error', {
  inserted (el, binding, vnode) {
    if (!binding.arg) {
      throw new Error(`v-error: missing argument on ${el.outerHTML}`)
    }
    if (!vnode.context.$v.form[binding.arg]) {
      throw new Error(`v-error: vuelidate doesn't have validation for ${binding.arg}`)
    }
    const opts = binding.value
    const pErr = document.createElement(opts.tag || 'p')
    for (const attr in (opts.attrs || {})) {
      pErr.setAttribute(attr, opts.attrs[attr])
    }
    pErr.classList.add('error', 'is-hidden')
    el.insertAdjacentElement('afterend', pErr)
  },
  update (el, binding, vnode) {
    if (vnode.context.$v.form[binding.arg].$error) {
      for (const key in vnode.context.$v.form[binding.arg].$params) {
        if (!vnode.context.$v.form[binding.arg][key]) {
          el.nextElementSibling.innerText = key
          break
        }
      }
      el.nextElementSibling.classList.remove('is-hidden')
    } else {
      el.nextElementSibling.classList.add('is-hidden')
    }
  },
  unbind (el) {
    el.nextElementSibling.remove()
  }
})
