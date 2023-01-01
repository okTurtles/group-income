import Vue from 'vue'
import Navigation from '@containers/navigation/Navigation.vue'
import router from './controller/router.js'

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}: `, err)
}

new Vue({
  router: router,
  components: {
    Navigation
  },
  data () {
    return {
      ephemeral: {
        hello: 'Hello World!'
      }
    }
  }
}).$mount('#app')
