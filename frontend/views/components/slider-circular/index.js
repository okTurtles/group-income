// Original version: https://www.npmjs.com/package/vue-circle-slider
// Modified to change the dot on the slider and remove external dependencies
import CircleSlider from './components/CircleSlider.vue'

// Install the components
export function install (Vue) {
  Vue.component('circle-slider', CircleSlider)
  /* -- Add more components here -- */
}

// Expose the components
export {
  CircleSlider
  /* -- Add more components here -- */
}
