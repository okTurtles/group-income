import {
  Vue
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

if ('ontouchstart' in window || 'msMaxTouchPoints' in navigator) {
  import('vue2-touch-events').then(Vue2TouchEvents => Vue.use(Vue2TouchEvents.default))
} else Vue.directive('touch', {})
