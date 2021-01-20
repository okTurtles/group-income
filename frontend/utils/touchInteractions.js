import Vue from 'vue'

if ('ontouchstart' in window || navigator.msMaxTouchPoints) {
  import('vue2-touch-events').then(Vue2TouchEvents => Vue.use(Vue2TouchEvents.default))
} else Vue.directive('touch', {})
