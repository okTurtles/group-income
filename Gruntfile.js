/*
Reading material:

http://chris.house/blog/grunt-configuration-for-react-browserify-babelify/
https://www.reddit.com/r/javascript/comments/352f83/using_browserify_babelify_with_es6_modules_anyway/
http://www.sitepoint.com/setting-up-es6-project-using-babel-browserify/
https://babeljs.io/docs/setup/#browserify

https://github.com/babel/babelify
https://github.com/jmreidy/grunt-browserify
https://github.com/substack/watchify
https://github.com/vuejs/vueify
*/

module.exports = grunt => {
  require('load-grunt-tasks')(grunt)

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Alternatively (or in addition to), use
    // https://github.com/substack/watchify
    watch: {
      browserify: {
        files: ['src/scripts/**/*.js'],
        tasks: ['browserify']
      },
      // Live reloading: https://github.com/gruntjs/grunt-contrib-watch/blob/master/docs/watch-examples.md#live-reloading
      livereload: {
        options: { livereload: true },
        files: ['dest/**/*']
      }
    },

    browserify: {
      dist: {
        options: {
          transform: [['babelify', {presets: ['es2015', 'stage-3']}]]
        },
        files: { 'dist/app.js': ['src/app.js'] }
        // src: ['src/scripts/app.js'],
        // dest: 'dist/scripts/app.js'
      }
    },

    copy: {
      frontend: {
        cwd: 'frontend/static/',
        src: ['**'],
        dest: 'dist/static',
        expand: true
      }
    },

    clean: { dist: ['dist/*'] }

    //       https://github.com/gruntjs/grunt-contrib-connect
    //       https://github.com/lud2k/grunt-serve
    //       https://github.com/gruntjs/grunt-contrib-watch/blob/master/docs/watch-examples.md#live-reloading
    // TODO: see https://github.com/vuejs/vueify
    //       https://github.com/AgentME/browserify-hmr
    //       https://medium.com/@dan_abramov/the-death-of-react-hot-loader-765fa791d7c4

  })
  grunt.registerTask('default', [])
  grunt.registerTask('dev', []) // TODO: run the API server and the watch server
  grunt.registerTask('dist', ['copy'])
}
