const _ = require('lodash')
export default {
  install (Vue, options) {
    var include = function (path) {
      console.log(`include ${path} is template? ${__dirname}`) // TODO: delete out once it works
      // no prefix I tried works, probably b/c of browserify. Might need webpack for this to work
      var str = require('../views/' + path)
      // ejsify will return a template *function*
      return _.isString(str) ? str : str()
    }
    // none of these work, at least not with browserify
    Vue.filter('include', include)
    Vue.component('include', {
      template: '{{ file }}',
      props: {
        file: {
          type: String,
          required: true,
          coerce: include
        }
      }
    })
  }
}
