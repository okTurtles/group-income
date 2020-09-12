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
Vue.component('PaymentsHistoryModal', () => import('../views/containers/payments/PaymentsHistoryModal.vue'))
Vue.component('RemoveMember', () => import('../views/containers/proposals/RemoveMember.vue'))
Vue.component('ChangeVotingRules', () => import('../views/containers/proposals/ChangeVotingRules.vue'))

Vue.component('IncomeDetails', () => import('../views/containers/contributions/IncomeDetails.vue'))

Vue.component('PaymentDetail', () => import('../views/containers/payments/PaymentDetail.vue'))
Vue.component('RecordPayment', () => import('../views/containers/payments/RecordPayment.vue'))

Vue.component('UserProfile', () => import('../views/containers/user-settings/UserProfile.vue'))
Vue.component('Placeholder', () => import('../views/containers/user-settings/Placeholder.vue'))
Vue.component('Appearence', () => import('../views/containers/user-settings/Appearence.vue'))
Vue.component('AppLogs', () => import('../views/containers/user-settings/AppLogs.vue'))
Vue.component('Troubleshooting', () => import('../views/containers/user-settings/Troubleshooting.vue'))

// TODO Remove after design test period
Vue.component('DSModalFullscreen', () => import('../views/containers/design-system/DSModalFullscreen.vue'))
Vue.component('DSModalNested', () => import('../views/containers/design-system/DSModalNested.vue'))
Vue.component('DSModalQuery', () => import('../views/containers/design-system/DSModalQuery.vue'))
Vue.component('TimeTravel', () => import('../views/containers/navigation/TimeTravel.vue'))
