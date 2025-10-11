import Vue from 'vue'
// import PortalVue from 'portal-vue'

// 1. Setup vue2-touch-events
if ('ontouchstart' in window || 'msMaxTouchPoints' in navigator) {
  import('vue2-touch-events').then(Vue2TouchEvents => Vue.use(Vue2TouchEvents.default))
} else Vue.directive('touch', {})

// 2. Setup portal-vue (https://v2.portal-vue.linusb.org/guide/getting-started.html)
// Vue.use(PortalVue)
