import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import Vue from 'vue'
import Navigation from '@containers/navigation/Navigation.vue'
import router from './controller/router.js'
import './views/utils/vSafeHtml.js'
import '@common/translations.js'

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}: `, err)
}

async function startApp () {
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)
  await sbp('translations/init', navigator.language)

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
}

startApp()
