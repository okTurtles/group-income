import { Vue } from '@common/common.js'
/*
* Style tag overload because Vue is trying to compile
* the content inside the tag otherwise
*/
Vue.component('v-style', {
  render: function (createElement) {
    return createElement('style', this.$slots.default)
  }
})
