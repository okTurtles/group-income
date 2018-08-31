<template>
  <div class="box time-travel" @click="toggleVisibility">
    <vue-slider
      v-bind="config.sliderConfig" v-model="ephemeral.position"
      @callback="timeTravel"
    ></vue-slider>
    <div>{{ ephemeral.history.length }}</div>
  </div>
</template>
<style lang="scss" scoped>
.time-travel {
  position: fixed;
  bottom: 10px;
  left: 10%;
  width: 80%;
  z-index: $gi-zindex-tooltip;
  box-shadow: 0 2px 30px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
}

.ticks {
  display: flex;
  justify-content: space-between;
}

.ticks li {
  display: inline-block;
}
</style>
<script>
import sbp from '../../../../shared/sbp.js'
import VueSlider from 'vue-slider-component'
import store from '../../model/state.js'
import { REPLACED_STATE } from '../../utils/events.js'
import {cloneDeep} from '../../utils/giLodash.js'
const disableTimeTravel = true
export default {
  name: 'TimeTravel',
  components: {VueSlider},
  props: {toggleVisibility: Function},
  created () {
    if (disableTimeTravel) {
      console.log("[TimeTravel] this feature is disabled for now because it's causing problems...")
    } else {
      console.log('[TimeTravel] initial state:', this.ephemeral.history[this.ephemeral.position])
      store.subscribe((mutation, state) => {
        // console.log('[TimeTravel] spied mutation:', mutation)
        this.ephemeral.history.push(cloneDeep(state))
        this.config.sliderConfig.max += 1
        this.ephemeral.position = this.config.sliderConfig.max
        this.timeTravel(this.ephemeral.position)
      })
    }
  },
  methods: {
    timeTravel: function (position) {
      var state = this.ephemeral.history[position]
      // console.log(`Firing position ${position}:`, state)
      store.replaceState(state)
      sbp('okTurtles.events/emit', REPLACED_STATE)
    }
  },
  data () {
    return {
      ephemeral: {
        history: [cloneDeep(store.state)],
        position: 0
      },
      config: {
        sliderConfig: {
          piecewise: true,
          tooltip: 'hover',
          min: 0,
          max: 0,
          piecewiseStyle: {
            backgroundColor: '#ccc',
            visibility: 'visible',
            width: '12px',
            height: '12px'
          },
          piecewiseActiveStyle: {
            backgroundColor: '#3498db'
          }
        }
      }
    }
  }
}
</script>
