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

// TODO: get rid of this import and standalone-ify this file
import {insertScript, insertVendorScript, waitForGlobal} from './utils'

;(function () {
  var Script2 = {installed: false}

  Script2.install = function (Vue, options = {}) {
    if (Script2.installed) return
    var customAttrs = ['vendor', 'global', 'unload', 'waitfor']
    // from: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
    // don't have 'async' or 'defer' bc those don't allow document.write according to:
    // http://www.html5rocks.com/en/tutorials/speed/script-loading/
    var scriptAttrs = ['src', 'type', 'integrity', 'text', 'crossorigin']

    // http://vuejs.org/guide/custom-directive.html
    Vue.elementDirective('script2', {
      params: customAttrs.concat(scriptAttrs),
      bind () {
        if (this.params.global && window[this.params.global]) {
          return // already loaded
        }
        var parent = this.el.parentElement

        if (this.params.vendor) {
          insertVendorScript(parent, this.params.vendor, this.params)
        } else if (this.params.src) {
          insertScript(parent, this.params.src, this.params)
        } else {
          // TODO: create the plugin and call it vue-restore-script
          var s = document.createElement('script')
          s.type = 'text/javascript'
          s.appendChild(document.createTextNode(this.el.innerHTML))
          this.params.waitfor
            ? waitForGlobal(this.params.waitfor, () => parent.appendChild(s))
            : Vue.nextTick(() => parent.appendChild(s))
        }
        Vue.util.remove(this.el) // remove <script2> since we inserted a <script>
      },
      unbind () {
        var unload = this.params.unload
        if (unload) {
          if (typeof unload === 'string') new Function(unload)() // eslint-disable-line
          var sym = this.params.global
          sym
            ? delete window[sym]
            : console.error(`${this.name}: can't unload! attribute 'global' not defined!`)
        }
      }
    })
  }
  if (typeof exports === 'object') {
    module.exports = Script2  // node / ES6 module
  } else if (typeof define === 'function' && define.amd) {
    define([], () => Script2) // requirejs
  } else if (window.Vue) {
    Vue.use(Script2)          // loaded via <script> tag in HTML
  }
})()
