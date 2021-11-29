<template lang='pug'>
  .time-travel
    vue-slider(
      v-model='ephemeral.position'
      v-bind='config.sliderConfig'
      @change='timeTravel'
    )
</template>

<script>
import sbp from '~/shared/sbp.js'
import VueSlider from 'vue-slider-component'
import store from '@model/state.js'
import { REPLACED_STATE } from '@utils/events.js'
import { cloneDeep } from '@utils/giLodash.js'
// since we are lazyily loaded outside of main.js, we must re-register these selectors
// otherwise, for reasons beyond me (having to with how System.js works), we will get
// "TypeError: selectors[selector] is not a function" getting thrown from line 27 of sbp.js...
import '~/shared/domains/okTurtles/data.js'
import '~/shared/domains/okTurtles/events.js'
const disableTimeTravel = false
export default ({
  name: 'TimeTravel',
  components: { VueSlider },
  created () {
    if (disableTimeTravel) {
      console.debug("[TimeTravel] this feature is disabled for now because it's causing problems...")
    } else {
      console.debug('[TimeTravel] initial state:', this.ephemeral.history[this.ephemeral.position])
      // TODO: use https://vuex.vuejs.org/api/#subscribeaction instead,
      //       and reset the state to whatever it was last if the current
      //       position is not at the max
      store.subscribe((mutation, state) => {
        console.debug('[TimeTravel] spied mutation:', mutation)
        this.ephemeral.history.push(cloneDeep(state))
        this.config.sliderConfig.max += 1
        this.$nextTick(() => {
          // do this in nextTick to prevent
          // "[VueSlider error]: The "value" cannot be greater than the maximum."
          this.ephemeral.position = this.config.sliderConfig.max
        })
      })
    }
  },
  methods: {
    timeTravel () {
      const state = this.ephemeral.history[this.ephemeral.position]
      console.debug(`Firing position ${this.ephemeral.position}:`, state)
      store.replaceState(state)
      sbp('okTurtles.events/emit', REPLACED_STATE)
    }
  },
  data () {
    return {
      ephemeral: {
        history: [cloneDeep(store.state)],
        // no matter what I tried, cloneDeep would preserve getters & setters :-\
        // however, in testing the time travel, this didn't seem to matter!
        // so I'm keeping it using cloneDeep. FYI, storing the stingified state
        // did work make the getters & setters not appear in the console (when logged),
        // but again, this doesn't seem to matter
        // history: [JSON.stringify(store.state)],
        position: 0
      },
      config: {
        sliderConfig: {
          marks: true,
          adsorb: true,
          lazy: false,
          min: 0,
          max: 0,
          interval: 1
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "vue-slider-component/lib/theme/default.scss";

.time-travel {
  position: fixed;
  bottom: 30px;
  left: 20%;
  width: 60%;
  z-index: 10000;
  padding: 10px 20px;
  box-shadow: 0 2px 30px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
}

input.slider {
  width: 100%;
  padding: 10px 0;
}
</style>
