import Vue from 'vue'
import LoadingPage from '@views/containers/loading-error/LoadingPage.vue'
import ErrorPage from '@views/containers/loading-error/ErrorPage.vue'
import LoadingModal from '@views/containers/loading-error/LoadingModal.vue'
import ErrorModal from '@views/containers/loading-error/ErrorModal.vue'
import LoadingModalFullScreen from '@views/containers/loading-error/LoadingBaseModal.vue'

const lazyLoadView = ({ component, loading = LoadingPage, error = ErrorPage }) => {
  const AsyncHandler = () => ({ component, loading, error })

  return () =>
    Promise.resolve({
      functional: true,
      render (h, { data, children }) {
        return h(AsyncHandler, data, children)
      }
    })
}

Vue.component('LoginModal', lazyLoadView({ component: import('../views/containers/access/LoginModal.vue'), loading: LoadingModal, error: ErrorModal }))
Vue.component('SignupModal', lazyLoadView({ component: import('../views/containers/access/SignupModal.vue'), loading: LoadingModal, error: ErrorModal }))
Vue.component('PasswordModal', lazyLoadView({ component: import('../views/containers/access/PasswordModal.vue'), loading: LoadingModal, error: ErrorModal }))
Vue.component('UserSettingsModal', lazyLoadView({ component: import('../views/containers/user-settings/UserSettingsModal.vue'), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('GroupLeaveModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupLeaveModal.vue'), loading: LoadingModal, error: ErrorModal }))
// Vue.component('GroupDeletionModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupDeletionModal.vue'), loading: LoadingModal, error: ErrorModal }))
Vue.component('GroupMembersAllModal', lazyLoadView({ component: import('../views/containers/dashboard/GroupMembersAllModal.vue'), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('InvitationLinkModal', lazyLoadView({ component: import('../views/containers/group-settings/InvitationLinkModal.vue'), loading: LoadingModal, error: ErrorModal }))
Vue.component('GroupCreationModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupCreationModal.vue'), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('GroupJoinModal', lazyLoadView({ component: import('../views/containers/group-settings/GroupJoinModal.vue'), loading: LoadingModalFullScreen, error: ErrorModal }))

Vue.component('AddMembers', () => import('../views/containers/proposals/AddMembers.vue'))
Vue.component('MincomeProposal', () => import('../views/containers/proposals/Mincome.vue'))
Vue.component('PaymentsHistoryModal', () => import('../views/containers/payments/PaymentsHistoryModal.vue'))
Vue.component('RemoveMember', () => import('../views/containers/proposals/RemoveMember.vue'))
Vue.component('ChangeVotingRules', () => import('../views/containers/proposals/ChangeVotingRules.vue'))

Vue.component('IncomeDetails', () => import('../views/containers/contributions/IncomeDetails.vue'))

Vue.component('PaymentDetail', () => import('../views/containers/payments/PaymentDetail.vue'))
Vue.component('RecordPayment', () => import('../views/containers/payments/RecordPayment.vue'))

// TODO Remove after design test period
Vue.component('DSModalSimple', () => import('../views/containers/design-system/DSModalSimple.vue'))
Vue.component('DSModalNested', () => import('../views/containers/design-system/DSModalNested.vue'))
Vue.component('TimeTravel', () => import('../views/containers/navigation/TimeTravel.vue'))

export default lazyLoadView
