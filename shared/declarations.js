/* eslint no-undef: "off", no-unused-vars: "off" */
// =======================
// prevent flow from bitching about globals
// =======================

// TODO: create a script in scripts/ to run flow via grunt-exec
//       and have it output (at the end of the run) helpful suggestions
//       like how to use `declare module` to ignore .vue requires,
//       and also a strong urging to not overdue the types because
//       FlowType is a little bit stupid and it can turn into a
//       banging-head-on-desk timesink (literally those words).
// TODO: create a types/ folder and put the module stuff below into
//       a separate file. Have the script mention these files on error
// TODO: if necessary, export the declarations above (in a separate exports
//       file) and import them in the files where they're used. This helps
//       with readability and it will make the linters stop bitching without
//       needing to create a global for each one of them in package.json.

// our globals
declare function logger(err: Error): void
// nodejs globals
declare var process: any
// mocha globals
declare var describe: any
declare var it: any
declare var after: any
declare var $: any

// =======================
// prevent flow from bitching about "Required module not found"
// https://github.com/facebook/flow/issues/2092#issuecomment-232917073
// =======================
declare module 'bcrypt' { declare module.exports: any }
declare module 'bluebird' { declare module.exports: any }
declare module 'boom' { declare module.exports: any }
declare module 'bulma' { declare module.exports: any }
declare module 'ejs' { declare module.exports: any }
declare module 'font-awesome' { declare module.exports: any }
declare module 'form-data' { declare module.exports: any }
declare module 'form-serialize' { declare module.exports: any }
declare module 'hapi' { declare module.exports: any }
declare module 'i18next' { declare module.exports: any }
declare module 'i18next-xhr-backend' { declare module.exports: any }
declare module 'joi' { declare module.exports: any }
declare module 'knex' { declare module.exports: any }
declare module 'localforage' { declare module.exports: any }
declare module 'lodash-es' { declare module.exports: any }
declare module 'moment' { declare module.exports: any }
declare module 'multihashes' { declare module.exports: any }
declare module 'node-uuid' { declare module.exports: any }
declare module 'objection' { declare module.exports: any }
declare module 'poop' { declare module.exports: any }
declare module 'primus' { declare module.exports: any }
declare module 'primus-responder' { declare module.exports: any }
declare module 'primus-rooms' { declare module.exports: any }
declare module 'sha.js' { declare module.exports: any }
declare module 'sprint-js' { declare module.exports: any }
declare module 'sqlite3' { declare module.exports: any }
declare module 'string' { declare module.exports: any }
declare module 'superagent' { declare module.exports: any }
declare module 'tweetnacl' { declare module.exports: any }
declare module 'tweetnacl-util' { declare module.exports: any }
declare module 'uws' { declare module.exports: any }
declare module 'vee-validate' { declare module.exports: any }
declare module 'velocity-animate' { declare module.exports: any }
declare module 'vue' { declare module.exports: any }
declare module 'vue-router' { declare module.exports: any }
declare module 'vue-script2' { declare module.exports: any }
declare module 'vuex' { declare module.exports: any }
declare module 'ws' { declare module.exports: any }
declare module 'babel-register' { declare module.exports: any }
declare module 'babelify' { declare module.exports: any }
declare module 'chalk' { declare module.exports: any }
declare module 'cheerio' { declare module.exports: any }
declare module 'grunt' { declare module.exports: any }
declare module 'load-grunt-tasks' { declare module.exports: any }
declare module 'mocha' { declare module.exports: any }
declare module 'nightmare' { declare module.exports: any }
declare module 'pathmodify' { declare module.exports: any }
declare module 'should' { declare module.exports: any }
declare module 'standard' { declare module.exports: any }
declare module 'through2' { declare module.exports: any }
declare module 'vue-hot-reload-api' { declare module.exports: any }
declare module 'vueify' { declare module.exports: any }
declare module 'vueify-insert-css' { declare module.exports: any }
declare module 'xvfb-maybe' { declare module.exports: any }

// .vue and .ejs files
declare module '../views/i18n.vue' { declare module.exports: Object }
declare module './views/CreateGroup.vue' { declare module.exports: Object }
declare module './views/i18n.vue' { declare module.exports: Object }
declare module './views/NavBar.vue' { declare module.exports: Object }
declare module './views/NewIncomeView.vue' { declare module.exports: Object }
declare module './views/PayGroupView.vue' { declare module.exports: Object }
declare module './views/SignUp.vue' { declare module.exports: Object }
declare module './views/UserGroupView.vue' { declare module.exports: Object }
declare module './views/UserProfileView.vue' { declare module.exports: Object }
declare module './views/VueAssistant.vue' { declare module.exports: Object }
declare module './views/test.ejs' { declare module.exports: string }

// we ignored everything in assets/, so...
declare module '../frontend/simple/assets/vendor/primus' { declare module.exports: Function }
