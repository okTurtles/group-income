import Vue from 'vue'
// NOTE: any modals opened with `OPEN_MODAL` go here
Vue.component('LoginModal', () => import('../views/containers/access/LoginModal.vue'))
Vue.component('SignupModal', () => import('../views/containers/access/SignupModal.vue'))
Vue.component('UserSettingsModal', () => import('../views/containers/user-settings/UserSettingsModal.vue'))
Vue.component('PasswordModal', () => import('../views/containers/access/PasswordModal.vue'))
Vue.component('GroupLeaveModal', () => import('../views/containers/group-settings/GroupLeaveModal.vue'))
// Vue.component('GroupDeletionModal', () => import('../views/containers/group-settings/GroupDeletionModal.vue'))
Vue.component('GroupMembersAllModal', () => import('../views/containers/dashboard/GroupMembersAllModal.vue'))
Vue.component('InvitationLinkModal', () => import('../views/containers/group-settings/InvitationLinkModal.vue'))

Vue.component('GroupCreationModal', () => import('../views/containers/group-settings/GroupCreationModal.vue'))
Vue.component('GroupJoinModal', () => import('../views/containers/group-settings/GroupJoinModal.vue'))

Vue.component('AddMembers', () => import('../views/containers/proposals/AddMembers.vue'))
Vue.component('MincomeProposal', () => import('../views/containers/proposals/Mincome.vue'))
Vue.component('PayGroupHistoryModal', () => import('../views/containers/payments/PayGroupHistoryModal.vue'))
Vue.component('RemoveMember', () => import('../views/containers/proposals/RemoveMember.vue'))
Vue.component('RuleAddMemberProposal', () => import('../views/containers/proposals/RuleAddMember.vue'))
Vue.component('RuleChangeRuleProposal', () => import('../views/containers/proposals/RuleChangeRule.vue'))
Vue.component('RuleRemoveMemberProposal', () => import('../views/containers/proposals/RuleRemoveMember.vue'))

Vue.component('IncomeDetails', () => import('../views/containers/contributions/IncomeDetails.vue'))

// TODO Remove after design test period
Vue.component('DSModalSimple', () => import('../views/containers/design-system/DSModalSimple.vue'))
Vue.component('DSModalNested', () => import('../views/containers/design-system/DSModalNested.vue'))
Vue.component('TimeTravel', () => import('../views/containers/navigation/TimeTravel.vue'))
