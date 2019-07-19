import Vue from 'vue'
// NOTE: any modals opened with `LOAD_MODAL` go here
Vue.component('LoginModal', () => import('../views/containers/modals/Login.vue'))
Vue.component('SignUp', () => import('../views/containers/modals/SignUp.vue'))
Vue.component('Settings', () => import('../views/containers/settings/Wrapper.vue'))
Vue.component('PasswordModal', () => import('../views/containers/modals/PasswordModal.vue'))
Vue.component('LeaveGroupModal', () => import('../views/containers/modals/LeaveGroup.vue'))
Vue.component('DeleteGroup', () => import('../views/containers/modals/DeleteGroup.vue'))
Vue.component('MincomeProposal', () => import('../views/containers/proposals/Mincome.vue'))
Vue.component('RuleAddMemberProposal', () => import('../views/containers/proposals/RuleAddMember.vue'))
Vue.component('RuleChangeRuleProposal', () => import('../views/containers/proposals/RuleChangeRule.vue'))
Vue.component('RuleRemoveMemberProposal', () => import('../views/containers/proposals/RuleRemoveMember.vue'))

// TODO Remove after design test period
Vue.component('DesignSystemModal', () => import('../views/containers/modals/DesignSystem.vue'))
