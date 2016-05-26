// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
export function wrap (s, tag = 'div') {
  return `<${tag}>${s}</${tag}>`
}

// use VueScript2 to handle lazy-loading of routes in conjunction
// with browserify-shim. See Gruntfile for details.
import Vue from 'vue'
import VS2 from 'vue-script2'
Vue.use(VS2)
// Vue.use(require('./js/Script2'))

export function lazyLoadVue (component, base = '/simple/js') {
  // if we wanted to support vue-hot-reload-api in
  // lazy-loaded modules, then we could do something like this in main.js:
  // window.HOTAPI = require('vue-hot-reload-api')
  return function (resolve) {
    VS2.load(`${base}/${component}.js`).then(() => resolve(window[component]))
  }
}
