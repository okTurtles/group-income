// wrap to prevent fragment instances:
// http://vuejs.org/guide/components.html#Fragment-Instance
export function wrap (s, tag = 'div') {
  return `<${tag}>${s}</${tag}>`
}

// This function is currently located in .Gruntfile.babel.js
// The problem is that fs.readFileSync doesn't work here (we're not in node)
// However it might be possible to do it this way (and avoid the ejsify thing)
// by using this: https://github.com/substack/brfs
// TODO: investigate this alternative. Then in main.js we'd do:
//       template: loadEJS('./views/test.ejs')
// export function loadEJS (pathOrStr, str, opts = {}) {
//   var path = pathOrStr
//   if (_.isPlainObject(str)) opts = str
//   if (/\.ejs$/.test(pathOrStr)) str = fs.readFileSync(pathOrStr)
//   str = require('ejs').render(str, opts.data || {}, _.merge({
//     filename: path,
//     compileDebug: process.env.NODE_ENV === 'development'
//   }, opts))
//   return opts.wrap ? wrap(str, opts.wrap) : str
// }
