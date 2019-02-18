'use strict'

import Vue from 'vue'
import Velocity from 'velocity-animate'
// TODO: investigate:
//       https://github.com/juliangarnier/anime
//       https://github.com/bendc/animateplus

// https://vuejs.org/guide/transitions.html#JavaScript-Transitions

Vue.component('fade', {
  // TODO: this template looks wrong? what is it doing here?
  template: `<transition name="fade" v-on:enter="enter" v-on:enter-cancelled="enterCancelled" v-on:leave="leave"
  v-on:leave-cancelled="leaveCancelled"></transition>
`,
  methods: {
    enter: function (el, done) {
      // https://github.com/oneuijs/You-Dont-Need-jQuery#css--style
      el.style.opacity = 0
      Velocity(el, { opacity: 1 }, 1000, done)
    },
    enterCancelled: function (el) {
      Velocity(el, 'stop')
    },
    leave: function (el, done) {
      // same as enter
      Velocity(el, { opacity: 0 }, 1000, done)
    },
    leaveCancelled: function (el) {
      Velocity(el, 'stop')
    }
  }
})
