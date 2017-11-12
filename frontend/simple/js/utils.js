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

// manually implemented lodash functions are better than even:
// https://github.com/lodash/babel-plugin-lodash
// additional tiny versions of lodash functions are available in VueScript2
export function mapValues (obj: Object, fn: Function, o: Object = {}) {
  for (let key in obj) { o[key] = fn(obj[key]) }
  return o
}

// bind local properties to on-the-fly created vue components
// .form key assumed because https://github.com/okTurtles/group-income-simple/issues/297
// boundKey passed as string to be able to pass prop 'as reference'
export const connect = (component, thisArg, boundKey) => ({
  template: `<comp v-model="value"></comp>`,
  components: { comp: component },
  computed: {
    value: {
      get: () => thisArg.form[boundKey],
      set: (newVal) => { thisArg.form[boundKey] = newVal }
    }
  }
})

// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
// NOTE: this was used for EJS files, which we no longer support
// export function wrap (s: string, tag: string = 'div') {
//   return `<${tag}>${s}</${tag}>`
// }

export default { lazyLoadVue }
