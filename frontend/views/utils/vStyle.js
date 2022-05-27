import {
  Vue
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
/*
* Style tag overload because Vue is trying to compile
* the content inside the tag otherwise
*/
Vue.component('v-style', {
  render: function (createElement) {
    return createElement('style', this.$slots.default)
  }
})
