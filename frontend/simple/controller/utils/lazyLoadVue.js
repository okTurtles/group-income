// use VueScript2 to handle lazy-loading of routes in conjunction
// with browserify-shim. See Gruntfile for details.
import Vue from 'vue'
import VS2 from 'vue-script2'
// import VS2 from '../../../ignored/Script2'
Vue.use(VS2)

export default function lazyLoadVue (component: string, base: string = '/simple/js') {
  // if we wanted to support vue-hot-reload-api in
  // lazy-loaded modules, then we could do something like this in main.js:
  // window.HOTAPI = require('vue-hot-reload-api')
  return function (resolve: Function, reject: Function) {
    VS2.load(`${base}/${component}.js`)
      .then(() => resolve(window[component]))
      .catch((err) => reject(err))
  }
}
