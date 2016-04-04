// http://hapijs.com/api/#error-transformation
const Boom = require('boom')

// Babel doesn't support this!
// https://babeljs.io/docs/learn-es2015/#proxies
// export var ErrToBoom = new Proxy(Boom, {
//   get: function (target, prop) {
//     if (!target[prop]) throw new Error(`Boom has no property '${prop}'`)
//     return function (err) {
//       return target[prop](err.errors && err.errors[0].message || err.message)
//     }
//   }
// })
// TODO: autogen these by going through Boom's methods
exports.ErrToBoom = {
  badRequest: function (err) {
    return Boom.badRequest(err.errors && err.errors[0].message || err.message)
  }
}
