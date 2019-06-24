import path from 'path'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import alias from 'rollup-plugin-alias'
import babel from 'rollup-plugin-babel'
import VuePlugin from 'rollup-plugin-vue'
import flow from 'rollup-plugin-flow'
import json from 'rollup-plugin-json'
import globals from 'rollup-plugin-node-globals'
// import sass from 'rollup-plugin-sass'
// import scss from 'rollup-plugin-scss'
// import css from 'rollup-plugin-css-only'
// import serve from 'rollup-plugin-serve'
// import livereload from 'rollup-plugin-livereload'

// const watchOn = !!process.env.ROLLUP_WATCH
// const development = process.env.NODE_ENV === 'development'

export default {
  input: 'frontend/simple/main.js',
  output: {
    file: 'dist/simple/main.js',
    format: 'iife',
    // dir: 'dist/simple',
    // format: 'esm',
    sourcemap: true,
    globals: {}
  },
  // see also:
  // https://github.com/calvinmetcalf/rollup-plugin-node-builtins
  // https://github.com/calvinmetcalf/rollup-plugin-node-globals
  external: ['crypto'],
  moduleContext: {
    'frontend/simple/controller/utils/primus.js': 'window'
  },
  plugins: [
    alias({
      // // https://vuejs.org/v2/guide/installation.html#Standalone-vs-Runtime-only-Build
      // https://github.com/rollup/rollup/issues/2609#issuecomment-449660274
      vue: path.resolve('./node_modules/vue/dist/vue.common.js')
    }),
    // scss({ output: true }),
    // css(),
    // BUG: https://github.com/vuejs/component-compiler-utils/issues/48#event-2072106973 ?
    // sass({
    //   output: true,
    //   runtime: require('node-sass'),
    //   options: {
    //     sourceMap: development,
    //     outputStyle: development ? 'nested' : 'compressed'
    //   }
    // }),
    resolve({
      // we set `preferBuiltins` to prevent rollup from erroring with
      // [!] (commonjs plugin) TypeError: Cannot read property 'warn' of undefined
      // TypeError: Cannot read property 'warn' of undefined
      preferBuiltins: false
    }),
    json(),
    VuePlugin({/* css: false */}),
    flow({ all: true }),
    commonjs({
      // include: ['node_modules/**'],
      namedExports: {
        'node_modules/vuelidate/lib/validators/index.js': [ 'required', 'between', 'email', 'minLength', 'requiredIf' ]
      }
    }),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**' // only transpile our source code
    }),
    globals()
  ]
}
