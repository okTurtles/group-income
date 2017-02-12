// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
export function wrap (s: string, tag: string = 'div') {
  return `<${tag}>${s}</${tag}>`
}

// use VueScript2 to handle lazy-loading of routes in conjunction
// with browserify-shim. See Gruntfile for details.
import Vue from 'vue'
import VS2 from 'vue-script2'
// import VS2 from './ignored/Script2'
Vue.use(VS2)

export function lazyLoadVue (component: string, base: string = '/simple/js') {
  // if we wanted to support vue-hot-reload-api in
  // lazy-loaded modules, then we could do something like this in main.js:
  // window.HOTAPI = require('vue-hot-reload-api')
  return function (resolve: Function, reject: Function) {
    VS2.load(`${base}/${component}.js`)
    .then(() => resolve(window[component]))
    .catch((err) => reject(err))
  }
}

// additional tiny versions of lodash functions are available in VueScript2
export function mapValues (obj: Object, fn: Function, o: Object = {}) {
  for (let key in obj) { o[key] = fn(obj[key]) }
  return o
}

export default { wrap, lazyLoadVue }
