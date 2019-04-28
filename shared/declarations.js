/* eslint no-undef: "off", no-unused-vars: "off" */
// =======================
// This file prevents flow from bitching about globals and "Required module not found"
// https://github.com/facebook/flow/issues/2092#issuecomment-232917073
//
// Note that the modules can (and should) be properly fixed with flow-typed
// https://github.com/okTurtles/group-income-simple/issues/157
// =======================

// TODO: create a script in scripts/ to run flow via grunt-exec
//       and have it output (at the end of the run) helpful suggestions
//       like how to use `declare module` to ignore .vue requires,
//       and also a strong urging to not overdue the types because
//       FlowType is a little bit stupid and it can turn into a
//       banging-head-on-desk timesink (literally those words).
//       Have the script explain which files represent what.

// our globals
declare function logger(err: Error): void
// nodejs globals
declare var process: any
// mocha globals
declare var describe: any
declare var it: any
declare var after: any
declare var $: any
// nightmare globals
declare var document: any

// =======================
// Fix "Required module not found" in a hackish way.
// TODO: Proper fix is to use:
// https://github.com/okTurtles/group-income-simple/issues/157
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
declare module 'lodash' { declare module.exports: any }
declare module 'lodash/debounce' { declare module.exports: any }
declare module 'flow-typer-js' { declare module.exports: any }
declare module 'multihashes' { declare module.exports: any }
declare module 'node-uuid' { declare module.exports: any }
declare module 'objection' { declare module.exports: any }
declare module 'primus' { declare module.exports: any }
declare module 'primus-responder' { declare module.exports: any }
declare module 'primus-rooms' { declare module.exports: any }
declare module 'sha.js' { declare module.exports: any }
declare module 'sprint-js' { declare module.exports: any }
declare module 'sqlite3' { declare module.exports: any }
declare module 'string' { declare module.exports: any }
declare module 'tweetnacl' { declare module.exports: any }
declare module 'tweetnacl-util' { declare module.exports: any }
declare module 'velocity-animate' { declare module.exports: any }
declare module 'vue' { declare module.exports: any }
declare module 'vue-router' { declare module.exports: any }
declare module 'vue-script2' { declare module.exports: any }
declare module 'vuex' { declare module.exports: any }
declare module 'ws' { declare module.exports: any }
declare module '@babel/register' { declare module.exports: any }
declare module 'babelify' { declare module.exports: any }
declare module 'chalk' { declare module.exports: any }
declare module 'cheerio' { declare module.exports: any }
declare module 'grunt' { declare module.exports: any }
declare module 'load-grunt-tasks' { declare module.exports: any }
declare module 'mocha' { declare module.exports: any }
declare module 'nightmare' { declare module.exports: any }
declare module 'pathmodify' { declare module.exports: any }
declare module 'should' { declare module.exports: any }
declare module 'should-sinon' { declare module.exports: any }
declare module 'sinon' { declare module.exports: any }
declare module 'standard' { declare module.exports: any }
declare module 'through2' { declare module.exports: any }
declare module 'vue-hot-reload-api' { declare module.exports: any }
declare module 'vueify' { declare module.exports: any }
declare module 'vueify-insert-css' { declare module.exports: any }
declare module 'xvfb-maybe' { declare module.exports: any }
declare module 'blakejs' { declare module.exports: any }
declare module 'protobufjs/light' { declare module.exports: any }
declare module 'node-fetch' { declare module.exports: any }
declare module 'string-template' { declare module.exports: any }
declare module 'node-sass' { declare module.exports: any }
declare module 'rollup-plugin-node-resolve' { declare module.exports: any }
declare module 'rollup-plugin-node-globals' { declare module.exports: any }
declare module 'rollup-plugin-commonjs' { declare module.exports: any }
declare module 'rollup-plugin-alias' { declare module.exports: any }
declare module 'rollup-plugin-babel' { declare module.exports: any }
declare module 'rollup-plugin-vue' { declare module.exports: any }
declare module 'rollup-plugin-flow' { declare module.exports: any }
declare module 'rollup-plugin-json' { declare module.exports: any }
declare module 'rollup-plugin-eslint' { declare module.exports: any }
declare module 'rollup-plugin-css-only' { declare module.exports: any }
declare module 'rollup-plugin-sass-variables' { declare module.exports: any }
declare module 'rollup' { declare module.exports: any }

// .vue and .ejs files
declare module './GroupName.vue' { declare module.exports: Object }
declare module './GroupPurpose.vue' { declare module.exports: Object }
declare module './GroupMincome.vue' { declare module.exports: Object }
declare module './GroupRules.vue' { declare module.exports: Object }
declare module './GroupPrivacy.vue' { declare module.exports: Object }
declare module './GroupInvitees.vue' { declare module.exports: Object }
declare module './GroupSummary.vue' { declare module.exports: Object }
declare module './Voting.vue' { declare module.exports: Object }
declare module './ButtonCountdown.vue' { declare module.exports: Object }
declare module './MenuItem.vue' { declare module.exports: Object }
declare module './MenuHeader.vue' { declare module.exports: Object }
declare module './MenuContent.vue' { declare module.exports: Object }
declare module './MenuTrigger.vue' { declare module.exports: Object }
declare module './MenuParent.vue' { declare module.exports: Object }
declare module './ListItem.vue' { declare module.exports: Object }
declare module './List.vue' { declare module.exports: Object }
declare module '../views/CreateGroup.vue' { declare module.exports: Object }
declare module '../views/PayGroup.vue' { declare module.exports: Object }
declare module '../views/UserGroup.vue' { declare module.exports: Object }
declare module '../views/UserProfile.vue' { declare module.exports: Object }
declare module '../views/VueAssistant.vue' { declare module.exports: Object }
declare module '../views/GroupDashboard.vue' { declare module.exports: Object }
declare module '../views/ProposeMember.vue' { declare module.exports: Object }
declare module '../views/Vote.vue' { declare module.exports: Object }
declare module '../views/Invite.vue' { declare module.exports: Object }
declare module '../views/Mailbox.vue' { declare module.exports: Object }
declare module '../views/Join.vue' { declare module.exports: Object }
declare module '../views/Home.vue' { declare module.exports: Object }
declare module '../components/MembersCircle.vue' { declare module.exports: Object }
declare module '../components/i18n.vue' { declare module.exports: Object }
declare module '../views/DesignSystem.vue' { declare module.exports: Object }
declare module '../views/GroupChat.vue' { declare module.exports: Object }
declare module '../views/Messages.vue' { declare module.exports: Object }
declare module '../views/Contributions.vue' { declare module.exports: Object }
declare module './views/components/Modal/Modal.vue' { declare module.exports: Object }
declare module './interface.js' { declare module.exports: any }
declare module './views/containers/sidebar/Sidebar.vue' { declare module.exports: Object }
declare module './views/components/Modal/Modal.vue' { declare module.exports: Object }
declare module './MaskToModal.vue' { declare module.exports: Object }
declare module './Trigger.vue' { declare module.exports: Object }
declare module './Target.vue' { declare module.exports: Object }
declare module './Masker.vue' { declare module.exports: Object }
declare module './PieChart.vue' { declare module.exports: Object }
declare module './GraphLegendItem.vue' { declare module.exports: Object }
declare module './GraphLegendGroup.vue' { declare module.exports: Object }
declare module './Bars.vue' { declare module.exports: Object }
declare module './SupportHistory.vue' { declare module.exports: Object }
declare module './Progress.vue' { declare module.exports: Object }
declare module './views/containers/SignUp.vue' { declare module.exports: Object }
declare module './views/containers/LoginModal.vue' { declare module.exports: Object }
declare module './views/containers/proposals-form/Mincome.vue' { declare module.exports: Object }
declare module './views/containers/proposals-form/RuleChangeRule.vue' { declare module.exports: Object }
declare module './views/containers/proposals-form/RuleAddMember.vue' { declare module.exports: Object }
declare module './views/containers/proposals-form/RuleRemoveMember.vue' { declare module.exports: Object }
declare module './views/components/AppStyles.vue' { declare module.exports: Object }

declare module '../../utils/flow-typer.js' { declare module.exports: Object }
declare module './backend/pubsub.js' { declare module.exports: Function }
declare module './pubsub.js' { declare module.exports: Function }
declare module './functions.js' { declare module.exports: Function }
declare module '../shared/functions.js' { declare module.exports: Function }
declare module '../../shared/functions.js' { declare module.exports: Function }
declare module '../../../shared/functions.js' { declare module.exports: Function }
declare module '../../../sbp.js' { declare module.exports: Function }
declare module '../shared/sbp.js' { declare module.exports: Function }
declare module '../../shared/sbp.js' { declare module.exports: Function }
declare module '../../../shared/sbp.js' { declare module.exports: Function }
declare module '../shared/domains/okTurtles/data/index.js' { declare module.exports: Object }
declare module  '../shared/GIMessage.js' { declare module.exports: Object }
declare module  '../../shared/GIMessage.js' { declare module.exports: Object }
declare module './server.js' { declare module.exports: any }
declare module './constants.js' { declare module.exports: Object }
declare module '../shared/constants.js' { declare module.exports: Object }
declare module '../../shared/constants.js' { declare module.exports: Object }
declare module '../../../shared/constants.js' { declare module.exports: Object }
declare module './database.js' { declare module.exports: Function }
declare module './auth.js' { declare module.exports: Object }
declare module './routes.js' { declare module.exports: Function }
declare module './utils/pubsub.js' { declare module.exports: Function }
declare module './utils/misc.js' { declare module.exports: Function }
declare module '../model/state.js' { declare module.exports: Object }
declare module './model/state.js' { declare module.exports: Object }
declare module '../views/components/CreateGroupSteps/index.js' { declare module.exports: Object }
declare module './countdownStates' { declare module.exports: Object }
declare module './types' { declare module.exports: any }
declare module './types.js' { declare module.exports: any }
declare module '../../shared/types.js' { declare module.exports: any }
declare module '../../../shared/types.js' { declare module.exports: any }
declare module './utils/events' { declare module.exports: any }
declare module '../utils/events.js' { declare module.exports: any }
declare module '../../utils/events.js' { declare module.exports: any }
declare module '../utils/giLodash.js' { declare module.exports: Function }
declare module '../../utils/giLodash.js' { declare module.exports: Function }
declare module '../frontend/utils/giLodash.js' { declare module.exports: Function }
declare module './contracts.js' { declare module.exports: Object }
declare module '../frontend/model/contracts.js' { declare module.exports: Object }
declare module '../utils.js' { declare module.exports: Function }
declare module './contracts/mailbox.js' { declare module.exports: Object }
declare module './contracts/identity.js' { declare module.exports: Object }
declare module './contracts/group.js' { declare module.exports: Object }
declare module './model/database.js' { declare module.exports: Function }
declare module './controller/router.js' { declare module.exports: Object }
declare module './controller/backend.js' { declare module.exports: Function }
declare module '../frontend/controller/backend.js' { declare module.exports: Function }
declare module '../../utils/string-template.js' { declare module.exports: Function }
declare module '../frontend/utils/distribution/mincome-default' { declare module.exports: Function }
declare module '../frontend/utils/distribution/mincome-proportional' { declare module.exports: Function }
declare module './controller/namespace.js' { declare module.exports: any }
declare module '../frontend/controller/namespace.js' { declare module.exports: any }
declare module './views/utils/translations.js' { declare module.exports: any }
declare module '../shared/domains/okTurtles/events/index.js' { declare module.exports: any }
declare module './lazyLoadedView.js' { declare module.exports: any }
declare module '../shared/domains/okTurtles/events/index.js' { declare module.exports: any }
declare module '../backend/index.js' { declare module.exports: any }
declare module './utils/autofocus.js' { declare module.exports: any }
declare module './views/utils/v-style.js' { declare module.exports: any }
declare module './colors.js' { declare module.exports: any }

// we ignored everything in assets/, so...
declare module '../frontend/controller/utils/primus.js' { declare module.exports: Function }
declare module './primus.js' { declare module.exports: Function }
