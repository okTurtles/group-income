import path from 'path'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import alias from 'rollup-plugin-alias'
import babel from 'rollup-plugin-babel'
import vue from 'rollup-plugin-vue'
import sass from 'rollup-plugin-sass'
// import scss from 'rollup-plugin-scss'
// import css from 'rollup-plugin-css-only'
import flow from 'rollup-plugin-flow'

const watchOn = !!process.env.ROLLUP_WATCH
const development = process.env.NODE_ENV === 'development'

export default {
  input: 'frontend/simple/main.js',
  output: {
    file: 'dist/simple/app.js',
    format: 'iife',
    sourcemap: true
  },
  moduleContext: {
    'frontend/simple/assets/vendor/primus.js': 'window'
  },
  external: [ 'crypto' ],
  plugins: [
    alias({
      // // https://vuejs.org/v2/guide/installation.html#Standalone-vs-Runtime-only-Build
      // https://github.com/rollup/rollup/issues/2609#issuecomment-449660274
      vue: path.resolve('./node_modules/vue/dist/vue.common.js')
    }),
    // scss({ output: true }),
    // css(),
    // BUG: https://github.com/vuejs/component-compiler-utils/issues/48#event-2072106973 ?
    vue({
      // css: false
    }),
    flow({ all: true }),
    sass({
      output: true,
      runtime: require('node-sass'),
      options: {
        sourceMap: development,
        outputStyle: development ? 'nested' : 'compressed',
        includePaths: [
          './node_modules/bulma',
          './node_modules/@fortawesome/fontawesome-free/scss'
        ]
      }
    }),
    resolve({
      // jsnext: true,
      preferBuiltins: false
    }),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**' // only transpile our source code
    }),
    commonjs({
      // ignoreGlobal: true,
      include: ['node_modules/**', 'frontend/simple/assets/vendor/primus.js'],
      // include: 'node_modules/**',
      // include: 'node_modules/@babel/runtime/**',
      // exclude: [ 'frontend/**', 'backend/**', 'test/**', 'shared/**', 'node_modules/rollup-plugin-node-resolve/**' ],
      // exclude: [ 'node_modules/vue-circle-slider/**' ],
      namedExports: {
        // 'node_modules/@babel/runtime/helpers/asyncToGenerator.js': [ 'default' ]
        'node_modules/vuelidate/lib/validators/index.js': [ 'required', 'between', 'email', 'minLength', 'requiredIf' ],
        'node_modules/flow-typer-js/dist/index.js': [ 'objectOf', 'arrayOf', 'optional', 'string', 'number', 'object' ]
        // 'node_modules/vue-circle-slider/index.js': [ 'CircleSlider' ]
      }
      // ignore: [ 'node_modules/vuelidate/lib/validators/index.js' ]
    }),
    watchOn && serve({
      historyApiFallback: true,
      contentBase: './dist/simple'
    }),
    watchOn && livereload('./dist/simple')

    // !development && uglify() // minify, but only in production (see rollup-plugin-uglify)
  ]
}
