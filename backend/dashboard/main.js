import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import Vue from 'vue'
import router from './controller/router.js'
import store from './model/state.js'
import './views/utils/vStyle.js'
import './views/utils/vSafeHtml.js'
import './controller/backend.js'
import '@common/translations.js'

// vue-components
import Toolbar from '@containers/toolbar/Toolbar.vue'
import Navigation from '@containers/navigation/Navigation.vue'
import AppStyles from '@components/AppStyles.vue'

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}: `, err)
}

async function startApp () {
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)
  await sbp('translations/init', 'en-US' /* navigator.language */)

  new Vue({
    router,
    store,
    components: {
      Toolbar,
      Navigation,
      AppStyles
    },
    data () {
      return {
        isNavOpen: false
      }
    },
    computed: {
      noNavigation () {
        return ['/design-system'].includes(this.$route.path)
      }
    },
    methods: {
      openNav () {
        this.$refs.navigation.open()
      }
    }
  }).$mount('#app')
}

startApp()
