import Vue from 'vue'

// TODO: implement loading & error pages/modals for lazy-loaded modal & page components
//       as described in https://v2.vuejs.org/v2/guide/components-dynamic-async.html#Handling-Loading-State

export function lazyComponent (name, lazyImport) {
  Vue.component(name, lazyImport)
  // NOTE: will be expanded to Vue.component(name, () => ({ component: ... , loading: ..., error: ... })) format
  //       once error & loading page & modal skeletons are implemented.
}
