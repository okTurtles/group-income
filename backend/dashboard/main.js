import sbp from '@sbp/sbp'
import '@sbp/okturtles.data'
import '@sbp/okturtles.events'
import Vue from 'vue'
import router from './controller/router.js'
import store from './model/state.js'
import { initTheme } from './model/themes.js'
import './views/utils/vStyle.js'
import './views/utils/vError.js'
import './views/utils/vSafeHtml.js'
import './views/utils/ui.js'
import './controller/backend.js'
import '@common/translations.js'

// custom directive declarations
import './views/utils/custom-directives/index.js'

// register lazy components
import './views/utils/lazyLoadComponents.js'

// vue-components
import Modal from '@containers/modal/Modal.vue'
import Toolbar from '@containers/toolbar/Toolbar.vue'
import Navigation from '@containers/navigation/Navigation.vue'
import AppStyles from '@components/AppStyles.vue'

Vue.config.errorHandler = function (err, vm, info) {
  console.error(`uncaught Vue error in ${info}: `, err)
}

async function startApp () {
  sbp('okTurtles.data/set', 'API_URL', window.location.origin)
  await sbp('translations/init', 'en-US' /* TODO!: switch back to navigator.language once the development is complete..! */)

  new Vue({
    router,
    store,
    components: {
      Toolbar,
      Navigation,
      AppStyles,
      Modal
    },
    data () {
      return {
        isNavOpen: false
      }
    },
    computed: {
      hideNavigation () {
        return ['DesignSystem', 'Landing'].includes(this.$route.name)
      },
      hideToolbar () {
        return this.$route.name === 'Landing'
      }
    },
    methods: {
      openNav () {
        this.$refs.navigation.open()
      }
    },
    created () {
      initTheme()
    }
  }).$mount('#app')
}

startApp()
