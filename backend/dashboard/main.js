import Vue from 'vue'
import TestImage from './views/components/TestImage.vue'
import './assets/style/main.scss'

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}: `, err)
}

new Vue({
  components: {
    TestImage
  },
  data () {
    return {
      ephemeral: {
        hello: 'Hello World!'
      }
    }
  }
}).$mount('#app')