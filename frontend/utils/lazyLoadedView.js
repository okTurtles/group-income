import Vue from 'vue'
import LoadingPage from '@views/containers/loading-error/LoadingPage.vue'
import LoadingModal from '@views/containers/loading-error/LoadingModal.vue'
import LoadingBaseModal from '@views/containers/loading-error/LoadingBaseModal.vue'

// TODO Remove after design test period
Vue.component('DSModalSimple', () => import('../views/containers/design-system/DSModalSimple.vue'))
Vue.component('DSModalNested', () => import('../views/containers/design-system/DSModalNested.vue'))
Vue.component('TimeTravel', () => import('../views/containers/navigation/TimeTravel.vue'))

const lazyLoadView = ({ component, loading = LoadingPage, error = LoadingPage }) => {
  const AsyncHandler = () => ({ component, loading, error })

  return () =>
    Promise.resolve({
      functional: true,
      render (h, { data, children }) {
        return h(AsyncHandler, data, children)
      }
    })
}

Vue.component('LoginModal', lazyLoadView({ component: import('../views/containers/access/LoginModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('SignupModal', lazyLoadView({ component: import('../views/containers/access/SignupModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('UserSettingsModal', lazyLoadView({ component: import('../views/containers/user-settings/UserSettingsModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('PasswordModal', lazyLoadView({ component: import('../views/containers/access/PasswordModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('GroupLeaveModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupLeaveModal.vue'), loading: LoadingBaseModal, error: LoadingModal }))
// Vue.component('GroupDeletionModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupDeletionModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('GroupMembersAllModal', lazyLoadView({ component: import('../views/containers/dashboard/GroupMembersAllModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('InvitationLinkModal', lazyLoadView({ component: import('../views/containers/group-settings/InvitationLinkModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('GroupCreationModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupCreationModal.vue'), loading: LoadingModal, error: LoadingModal }))
Vue.component('GroupJoinModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupJoinModal.vue'), loading: LoadingModal, error: LoadingModal }))

Vue.component('AddMembers', lazyLoadView({ component: import('../views/containers/proposals/AddMembers.vue') }))
Vue.component('MincomeProposal', lazyLoadView({ component: import('../views/containers/proposals/Mincome.vue') }))
Vue.component('PaymentsHistoryModal', lazyLoadView({ component: import('../views/containers/payments/PaymentsHistoryModal.vue') }))
Vue.component('RemoveMember', lazyLoadView({ component: import('../views/containers/proposals/RemoveMember.vue') }))
Vue.component('RuleAddMemberProposal', lazyLoadView({ component: import('../views/containers/proposals/RuleAddMember.vue') }))
Vue.component('ChangeVotingProposal', lazyLoadView({ component: import('../views/containers/proposals/ChangeVotingProposal.vue') }))
Vue.component('RuleRemoveMemberProposal', () => import('../views/containers/proposals/RuleRemoveMember.vue'))
Vue.component('IncomeDetails', lazyLoadView({ component: import('../views/containers/contributions/IncomeDetails.vue') }))
Vue.component('PaymentDetail', lazyLoadView({ component: import('../views/containers/payments/PaymentDetail.vue') }))
Vue.component('RecordPayment', lazyLoadView({ component: import('../views/containers/payments/RecordPayment.vue') }))
