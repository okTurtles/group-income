/* globals Vue, define */
// Using <script> to load vendor scripts does not (currently) work
// with Vue.js's vue-router, see:
//  https://github.com/vuejs/vue-router/issues/467
//  https://github.com/okTurtles/group-income-simple/issues/64
// So this simply re-creates that behavior.
//
// This Vue.js component fixes that and is globally available
// in .ejs and .vue files.
//
// To use, just:
//
// 1. search-replace "<script " with "<script2 "
// 2. search-replace "</script>" with "</script2>"

// TODO: get rid of this import and standalone-ify this file
import {insertScript} from './utils'
var _ = require('lodash') // TODO: get rid of lodash dependency for standalone version

;(function () {
  var Script2 = {
    installed: false,
    p: Promise.resolve(),
    loaded: {} // keys are the scripts that have been loaded
  }

  // TODO: create the plugin and call it vue-script2

  Script2.install = function (Vue, options = {}) {
    if (Script2.installed) return
    var customAttrs = ['unload']
    // from: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
    // don't have 'async' or 'defer' bc those don't allow document.write according to:
    // http://www.html5rocks.com/en/tutorials/speed/script-loading/
    var props = customAttrs.concat(['src', 'type', 'integrity', 'text', 'crossorigin'])
    Vue.component('script2', {
      props: props,
      // <slot> is important, see: http://vuejs.org/guide/components.html#Named-Slots
      template: '<div style="display:none"><slot></slot></div>',
      ready () {
        var parent = this.$el.parentElement
        if (!this.src) {
          Script2.p = Script2.p.then(() => {
            var s = document.createElement('script')
            s.type = 'text/javascript'
            s.appendChild(document.createTextNode(this.$el.innerHTML))
            parent.appendChild(s)
          })
        } else if (!Script2.loaded[this.src]) {
          var params = _.omitBy(_.pick(this, props), _.isUndefined)
          Script2.loaded[this.src] = true
          // seralizes execution. note this syntax does an implicit return
          Script2.p = Script2.p.then(() => insertScript(parent, this.src, params))
        }
        Vue.util.remove(this.$el) // remove dummy template <div>
      },
      destroyed () {
        if (this.unload) {
          if (typeof this.unload === 'string') {
            new Function(this.unload)() // eslint-disable-line
            delete Script2.loaded[this.src]
          } else {
            throw new Error(`${this.name}: can't unload! attribute 'unload' must contain code!`)
          }
        }
      }
    })

    Script2.installed = true
  }
  if (typeof exports === 'object') {
    module.exports = Script2  // node / ES6 module
  } else if (typeof define === 'function' && define.amd) {
    define([], () => Script2) // requirejs
  } else if (window.Vue) {
    Vue.use(Script2)          // loaded via <script> tag in HTML
  }
})()
