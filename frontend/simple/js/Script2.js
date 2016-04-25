/* globals Vue, define */
// Using <script> to load vendor scripts does not (currently) work
// with Vue.js's vue-router, see:
//  https://github.com/vuejs/vue-router/issues/467
// So this simply re-creates that behavior.
//
// This Vue.js component fixes that and is globally available
// in .ejs and .vue files.
//
// To use, just:
//
// 1. search-replace "<script " with "<script2 "
// 2. search-replace "</script>" with "</script2>"

// ------------------------------------------------------------
// This file will be converted into a standalone vue plugin
// and that is why we're modeling its structure after:
// https://github.com/vuejs/vue-touch/blob/master/vue-touch.js
// https://github.com/BosNaufal/vue-simple-store/blob/master/vue-simple-store.js
// ------------------------------------------------------------

// TODO: get rid of this import and standalone-ify this file
import {insertScript, insertVendorScript} from './utils'

;(function () {
  var Script2 = {intalled: false}

  Script2.install = function (Vue, options = {}) {
    if (Script2.installed) return
    var customAttrs = ['vendor', 'global', 'unload']
    // from: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
    var scriptAttrs = ['src', 'type', 'defer', 'async', 'integrity', 'text', 'crossorigin']

    // http://vuejs.org/guide/custom-directive.html
    Vue.elementDirective('script2', {
      params: customAttrs.concat(scriptAttrs),
      bind () {
        var sym = this.params.global
        if (sym && window[sym]) {
          // console.log(`window.${sym} already loaded`)
          return
        }
        if (this.params.vendor) {
          insertVendorScript(this.el, this.params.vendor, this.params)
        } else if (this.params.src) {
          insertScript(this.el, this.params.src, this.params)
        } else {
          console.error('ERROR! No `src` or `vendor` parameter on <script2> tag!')
        }
      },
      unbind () {
        // console.log(`${this.name} - unbind!`)
        var unload = this.params.unload
        if (unload) {
          if (typeof unload === 'string') {
            // console.log('executing:', unload)
            new Function(unload)() // eslint-disable-line
          }
          var sym = this.params.global
          if (!sym) {
            console.error(`${this.name}: can't unload! attribute 'global' not defined!`)
          } else {
            delete window[sym]
            // console.log(`deleted: window.${sym}`)
          }
        }
      }
    })
  }
  if (typeof exports === 'object') {
    // node / ES6 module
    module.exports = Script2
  } else if (typeof define === 'function' && define.amd) {
    // requirejs
    define([], () => Script2) // implicit return
  } else if (window.Vue) {
    // loaded via <script> tag in HTML
    Vue.use(Script2)
  }
})()
