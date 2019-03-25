import Vue from 'vue'
// NOTE: any modals opened with `LOAD_MODAL` go here
Vue.component('LoginModal', () => import('./views/containers/LoginModal.vue'))
Vue.component('SignUp', () => import('./views/containers/SignUp.vue'))
Vue.component('Settings', () => import('./views/containers/Settings/Wrapper.vue'))
Vue.component('Mincome', () => import('./views/containers/proposals-form/Mincome.vue'))
Vue.component('RuleChangeRule', () => import('./views/containers/proposals-form/RuleChangeRule.vue'))
Vue.component('RuleAddMember', () => import('./views/containers/proposals-form/RuleAddMember.vue'))
Vue.component('RuleRemoveMember', () => import('./views/containers/proposals-form/RuleRemoveMember.vue'))

// TODO Remove after design test period
Vue.component('DesignSystemModal', () => import('./views/containers/DesignSystemModal.vue'))
