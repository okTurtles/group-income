import Vue from 'vue'
// NOTE: any modals opened with `OPEN_MODAL` go here
Vue.component('LoginModal', () => import('../views/containers/modals/Login.vue'))
Vue.component('Signup', () => import('../views/containers/modals/Signup.vue'))
Vue.component('SettingsWrapper', () => import('../views/containers/settings/SettingsWrapper.vue'))
Vue.component('PasswordModal', () => import('../views/containers/modals/PasswordModal.vue'))
Vue.component('LeaveGroupModal', () => import('../views/containers/modals/LeaveGroup.vue'))
Vue.component('DeleteGroup', () => import('../views/containers/modals/DeleteGroup.vue'))
Vue.component('GroupMembersList', () => import('../views/containers/modals/GroupMembersList.vue'))
Vue.component('InviteByLink', () => import('../views/containers/modals/InviteByLink.vue'))

Vue.component('CreateGroup', () => import('../views/containers/modals/CreateGroup.vue'))
Vue.component('JoinGroup', () => import('../views/containers/modals/JoinGroup.vue'))

Vue.component('AddMembers', () => import('../views/containers/proposals/AddMembers.vue'))
Vue.component('MincomeProposal', () => import('../views/containers/proposals/Mincome.vue'))
Vue.component('PayGroupHistory', () => import('../views/containers/modals/PayGroupHistory.vue'))
Vue.component('RemoveMember', () => import('../views/containers/proposals/RemoveMember.vue'))
Vue.component('RuleAddMemberProposal', () => import('../views/containers/proposals/RuleAddMember.vue'))
Vue.component('RuleChangeRuleProposal', () => import('../views/containers/proposals/RuleChangeRule.vue'))
Vue.component('RuleRemoveMemberProposal', () => import('../views/containers/proposals/RuleRemoveMember.vue'))

Vue.component('IncomeDetails', () => import('../views/containers/contributions/IncomeDetails.vue'))

// TODO Remove after design test period
Vue.component('DesignSystemModal', () => import('../views/containers/modals/DesignSystem.vue'))
Vue.component('DesignSystemModalBase', () => import('../views/containers/modals/DesignSystemBase.vue'))
Vue.component('TimeTravel', () => import('../views/containers/TimeTravel.vue'))
