<template>
  <div class="box time-travel" @click="toggleVisibility">
    <vue-slider
      v-bind="sliderConfig" v-model="position"
      @callback="timeTravel"
    ></vue-slider>
    <div>{{ this.history.length }}</div>
  </div>
</template>

<style lang="sass" scoped>
.time-travel
  position: fixed
  bottom: 10px
  left: 10%
  width: 80%
  z-index: 99999
  box-shadow: 0px 2px 30px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1)

.ticks
  display: flex
  justify-content: space-between

.ticks li
  display: inline-block
</style>

<script>
import Vue from 'vue'
import VueSlider from 'vue-slider-component'
import store from '../js/state.js'
import _ from 'lodash'
export default {
  name: 'TimeTravel',
  components: {VueSlider},
  props: {toggleVisibility: Function},
  created () {
    console.log('[TimeTravel] initial state:', this.history[this.position])
    store.subscribe((mutation, state) => {
      // console.log('[TimeTravel] spied mutation:', mutation)
      this.history.push(_.cloneDeep(state))
      this.sliderConfig.max += 1
      this.position = this.sliderConfig.max
      this.timeTravel(this.position)
    })
  },
  methods: {
    timeTravel: function (position) {
      var state = this.history[position]
      console.log(`Firing position ${position}:`, state)
      store.replaceState(state)
      Vue.events.$emit('replacedState')
    }
  },
  data () {
    return {
      history: [_.cloneDeep(store.state)],
      position: 0,
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
</script>
