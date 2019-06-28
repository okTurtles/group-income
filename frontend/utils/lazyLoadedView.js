import Vue from 'vue'
// NOTE: any modals opened with `LOAD_MODAL` go here
Vue.component('LoginModal', () => import('../views/containers/modals/Login.vue'))
Vue.component('SignUp', () => import('../views/containers/modals/SignUp.vue'))
Vue.component('Settings', () => import('../views/containers/settings/Wrapper.vue'))
Vue.component('Mincome', () => import('../views/containers/proposals/Mincome.vue'))
Vue.component('RuleChangeRule', () => import('../views/containers/proposals/RuleChangeRule.vue'))
Vue.component('RuleAddMember', () => import('../views/containers/proposals/RuleAddMember.vue'))
Vue.component('RuleRemoveMember', () => import('../views/containers/proposals/RuleRemoveMember.vue'))
Vue.component('PasswordModal', () => import('../views/containers/modals/PasswordModal.vue'))

// TODO Remove after design test period
Vue.component('DesignSystemModal', () => import('../views/containers/modals/DesignSystem.vue'))
