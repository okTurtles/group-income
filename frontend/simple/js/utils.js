// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
export function wrap (s, tag = 'div') {
  return `<${tag}>${s}</${tag}>`
}

// use of this function is heavily discouraged! it's rather hackish.
// see also comment in test.ejs as to why script2 should be used instead.
export function waitForGlobal (sym, fn, {global = window, timeout = 100} = {}) {
  global[sym] ? fn() : setTimeout(waitForGlobal, timeout, sym, fn, {global, timeout})
}

var _ = require('lodash')

export function insertScript (el, src, opts = {}) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script')
    var defaults = _.partialRight(_.assignWith, (objVal, srcVal, key) =>
      (_.isUndefined(objVal) || objVal === '') && srcVal !== '' ? srcVal : objVal
    )
    // omit the special options that Script2 supports
    defaults(s, _.omit(opts, ['unload']), {
      type: 'text/javascript'
    })
    // according to: http://www.html5rocks.com/en/tutorials/speed/script-loading/
    // async does not like 'document.write' usage, which we & vue.js make
    // heavy use of based on the SPA style. Also, async can result
    // in code getting executed out of order from how it is inlined on the page.
    s.async = false // therefore set this to false
    s.src = src
    // inspiration from: https://github.com/eldargab/load-script/blob/master/index.js
    // and: https://github.com/ded/script.js/blob/master/src/script.js#L70-L82
    function success () { resolve(src) }
    s.onload = success
    s.onreadystatechange = () => { if (this.readyState === 'complete') success() } // IE
    s.onerror = () => { console.error('failed to load:', src); reject(src) }
    el.appendChild(s)
  })
}
