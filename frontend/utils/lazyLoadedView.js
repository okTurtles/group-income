import Vue from 'vue'
import LoadingPage from '@views/containers/loading-error/LoadingPage.vue'
import ErrorPage from '@views/containers/loading-error/ErrorPage.vue'
import LoadingModal from '@views/containers/loading-error/LoadingModal.vue'
import ErrorModal from '@views/containers/loading-error/ErrorModal.vue'
import LoadingModalFullScreen from '@views/containers/loading-error/LoadingBaseModal.vue'

/*
This method of loading components is documented here and is used to ensure compatibility
with lazy-loaded routes:
https://github.com/vuejs/vue-router/pull/2140/files#diff-7d999265ce5b22152fdffee108ca6385

WARNING: Components loaded with this strategy will **not** have access to in-component guards,
such as `beforeRouteEnter`, `beforeRouteUpdate`, and `beforeRouteLeave`. If you need to use
these, you must either use route-level guards instead or lazy-load the component directly, without
handling loading state.
*/

const lazyLoadView = (
  { component, loading = LoadingPage, error = ErrorPage }: Object
): Promise<Object> => {
  const AsyncHandler = () => ({ component, loading, error })

  return Promise.resolve({
    functional: true,
    render (h, { data, children }) {
      return h(AsyncHandler, data, children)
    }
  })
}

Vue.component('LoginModal', () => lazyLoadView({ component: import('../views/containers/access/LoginModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('SignupModal', () => lazyLoadView({ component: import('../views/containers/access/SignupModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('PasswordModal', () => lazyLoadView({ component: import('../views/containers/access/PasswordModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('UserSettingsModal', () => lazyLoadView({ component: import('../views/containers/user-settings/UserSettingsModal.vue').then(m => m.default), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('GroupLeaveModal', () => lazyLoadView({ component: import('../views/containers/group-settings/GroupLeaveModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('GroupDeletionModal', () => lazyLoadView({ component: import('../views/containers/group-settings/GroupDeletionModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('GroupMembersAllModal', () => lazyLoadView({ component: import('../views/containers/dashboard/GroupMembersAllModal.vue').then(m => m.default), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('InvitationLinkModal', () => lazyLoadView({ component: import('../views/containers/group-settings/InvitationLinkModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('GroupCreationModal', () => lazyLoadView({ component: import('../views/containers/group-settings/GroupCreationModal.vue').then(m => m.default), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('GroupJoinModal', () => lazyLoadView({ component: import('../views/containers/group-settings/GroupJoinModal.vue').then(m => m.default), loading: LoadingModalFullScreen, error: ErrorModal }))

Vue.component('AddMembers', () => import('../views/containers/proposals/AddMembers.vue').then(m => m.default))
Vue.component('MincomeProposal', () => import('../views/containers/proposals/Mincome.vue').then(m => m.default))
Vue.component('PaymentsHistoryModal', () => import('../views/containers/payments/PaymentsHistoryModal.vue').then(m => m.default))
Vue.component('RemoveMember', () => import('../views/containers/proposals/RemoveMember.vue').then(m => m.default))
Vue.component('ChangeVotingRules', () => import('../views/containers/proposals/ChangeVotingRules.vue').then(m => m.default))

Vue.component('IncomeDetails', () => lazyLoadView({ component: import('../views/containers/contributions/IncomeDetails.vue').then(m => m.default), loading: LoadingModalFullScreen, error: ErrorModal }))

Vue.component('PaymentDetail', () => import('../views/containers/payments/PaymentDetail.vue').then(m => m.default))
Vue.component('RecordPayment', () => import('../views/containers/payments/RecordPayment.vue').then(m => m.default))

Vue.component('UserProfile', () => import('../views/containers/user-settings/UserProfile.vue').then(m => m.default))
Vue.component('Placeholder', () => import('../views/containers/user-settings/Placeholder.vue').then(m => m.default))
Vue.component('Appearence', () => import('../views/containers/user-settings/Appearence.vue').then(m => m.default))
Vue.component('AppLogs', () => import('../views/containers/user-settings/AppLogs.vue').then(m => m.default))
Vue.component('Troubleshooting', () => import('../views/containers/user-settings/Troubleshooting.vue').then(m => m.default))
Vue.component('GroupMembersDirectMessages', () => import('../views/containers/chatroom/GroupMembersDirectMessages.vue').then(m => m.default))
Vue.component('CreateNewChannelModal', () => lazyLoadView({ component: import('../views/containers/chatroom/CreateNewChannelModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('EditChannelNameModal', () => lazyLoadView({ component: import('../views/containers/chatroom/EditChannelNameModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('EditChannelDescriptionModal', () => lazyLoadView({ component: import('../views/containers/chatroom/EditChannelDescriptionModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('ChatMembersAllModal', () => lazyLoadView({ component: import('../views/containers/chatroom/ChatMembersAllModal.vue').then(m => m.default), loading: LoadingModalFullScreen, error: ErrorModal }))
Vue.component('LeaveChannelModal', () => lazyLoadView({ component: import('../views/containers/chatroom/LeaveChannelModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))
Vue.component('DeleteChannelModal', () => lazyLoadView({ component: import('../views/containers/chatroom/DeleteChannelModal.vue').then(m => m.default), loading: LoadingModal, error: ErrorModal }))

Vue.component('NotificationModal', () => import('../views/containers/notifications/NotificationModal.vue').then(m => m.default))

// TODO Remove after design test period
Vue.component('DSModalFullscreen', () => import('../views/containers/design-system/DSModalFullscreen.vue').then(m => m.default))
Vue.component('DSModalNested', () => import('../views/containers/design-system/DSModalNested.vue').then(m => m.default))
Vue.component('DSModalQuery', () => import('../views/containers/design-system/DSModalQuery.vue').then(m => m.default))
Vue.component('TimeTravel', () => import('../views/containers/navigation/TimeTravel.vue').then(m => m.default))

export default lazyLoadView
