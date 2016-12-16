// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
export function wrap (s, tag = 'div') {
  return `<${tag}>${s}</${tag}>`
}

// use VueScript2 to handle lazy-loading of routes in conjunction
// with browserify-shim. See Gruntfile for details.
import Vue from 'vue'
import VS2 from 'vue-script2'
// import VS2 from './ignored/Script2'
Vue.use(VS2)

export function lazyLoadVue (component, base = '/simple/js') {
  // if we wanted to support vue-hot-reload-api in
  // lazy-loaded modules, then we could do something like this in main.js:
  // window.HOTAPI = require('vue-hot-reload-api')
  return function (resolve, reject) {
    VS2.load(`${base}/${component}.js`)
    .then(() => resolve(window[component]))
    .catch((err) => reject(err))
  }
}

// These headers will be included with all superagent requests
var request = require('superagent')
export function superagentHeader (header, value) {
  for (let method of ['get', 'post']) {
    var m = request[method] // var m = request.prototype[method]
    request[method] = (...args) => m.apply(request, args).set(header, value)
  }
}

const nacl = require('tweetnacl')
// const {encodeBase64, decodeBase64} = require('tweetnacl-util')

var b642buf = b64 => new Buffer(b64, 'base64')
var buf2b64 = buf => new Buffer(buf).toString('base64')
var str2buf = str => new Buffer(str, 'utf8')
var str2b64 = str => str2buf(str).toString('base64')
var ary2b64 = ary => new Buffer(ary).toString('base64')

// using lodash-es (which is what we're doing here even though it doesn't seem
// like it [see pathmodify in .Gruntfile.babel.js]), adds an extra 2000 lines to
// app.js just for this tiny function which is simple to implement ourselves.
// import mapValues from 'lodash/mapValues'
export let _ = {
  mapValues (obj, fn, o = {}) {
    for (let key in obj) { o[key] = fn(obj[key]) }
    return o
  }
}

export function sign (msg, {publicKey, secretKey}) {
  return str2b64(JSON.stringify({
    msg: msg,
    key: publicKey,
    sig: ary2b64(nacl.sign.detached(str2buf(msg), b642buf(secretKey)))
  }))
}
// TODO: generate these properly at the right time and store in the right location
//       See backend/interface.js
export const keypair = _.mapValues(nacl.sign.keyPair(), buf2b64)

export default { wrap, lazyLoadVue, superagentHeader, sign, keypair, _ }
