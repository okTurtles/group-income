<template lang="pug">
//- .box.time-travel
.time-travel
  //- for some reason vue-slider-component is invisible in the UI?!
  //- vue-slider(
  //-   v-bind='config.sliderConfig'
  //-   v-model='ephemeral.position'
  //-   @dragging='timeTravel'
  //- )
  input.slider(
    type='range'
    v-bind='config.sliderConfig'
    v-model='ephemeral.position'
    @input='timeTravel'
  )
  div {{ ephemeral.history.length }}
</template>

<script>
import sbp from '~/shared/sbp.js'
// import VueSlider from 'vue-slider-component'
import store from '@model/state.js'
import { REPLACED_STATE } from '@utils/events.js'
import { cloneDeep } from '@utils/giLodash.js'
// since we are lazyily loaded outside of main.js, we must re-register these selectors
// otherwise, for reasons beyond me (having to with how System.js works), we will get
// "TypeError: selectors[selector] is not a function" getting thrown from line 27 of sbp.js...
import '~/shared/domains/okTurtles/data.js'
import '~/shared/domains/okTurtles/events.js'
const disableTimeTravel = false
export default {
  name: 'TimeTravel',
  // components: { VueSlider }, // disabled until we can figure out how to make it visible
  created () {
    if (disableTimeTravel) {
      console.debug("[TimeTravel] this feature is disabled for now because it's causing problems...")
    } else {
      console.debug('[TimeTravel] initial state:', this.ephemeral.history[this.ephemeral.position])
      store.subscribe((mutation, state) => {
        console.debug('[TimeTravel] spied mutation:', mutation)
        this.ephemeral.history.push(cloneDeep(state))
        this.config.sliderConfig.max += 1
        this.ephemeral.position = this.config.sliderConfig.max
      })
    }
  },
  methods: {
    timeTravel () {
      var state = this.ephemeral.history[this.ephemeral.position]
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
          tooltip: 'focus',
          marks: true,
          adsorb: true,
          lazy: true,
          min: 0,
          max: 0
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// NOTE: importing this in a scoped section means that it will be
//       duplicated in the generated component.css, something we don't
//       want if we're actually going to use this component. We should
//       import the style globally instead.
// @import 'vue-slider-component/lib/theme/material.scss';
.time-travel {
  position: fixed;
  bottom: 10px;
  right: 10px;
  width: 60%;
  z-index: 10000;
  padding: 0 10px;
  box-shadow: 0 2px 30px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
}
input.slider {
  width: 100%;
  padding: 10px 0;
}
/*
.ticks {
  display: flex;
  justify-content: space-between;
}

.ticks li {
  display: inline-block;
}
*/
</style>
