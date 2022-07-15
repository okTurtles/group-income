import { Vue } from '@common/common.js'
import ErrorModal from '@views/containers/loading-error/ErrorModal.vue'
import ErrorPage from '@views/containers/loading-error/ErrorPage.vue'
import LoadingModal from '@views/containers/loading-error/LoadingModal.vue'
import LoadingModalFullScreen from '@views/containers/loading-error/LoadingBaseModal.vue'
import LoadingPage from '@views/containers/loading-error/LoadingPage.vue'

type LazyImport = () => Promise<Object>;

// See https://v2.vuejs.org/v2/guide/components-dynamic-async.html#Async-Components
function asyncHandler (lazyImport, { loading, error } = {}) {
  return () => ({
    // HACK: sometimes a bundler bug makes it necessary to use
    // `.then(m => m.default ?? m)` when importing a module with `import()`.
    component: lazyImport().then(m => m.default ?? m),
    loading,
    error
  })
}

export function lazyComponent (name: string, lazyImport: LazyImport, { loading, error }: Object = {}) {
  Vue.component(name, asyncHandler(lazyImport, { loading, error }))
}

export function lazyModal (name: string, lazyImport: LazyImport) {
  lazyComponent(name, lazyImport, {
    loading: LoadingModal,
    error: ErrorModal
  })
}

export function lazyModalFullScreen (name: string, lazyImport: LazyImport) {
  lazyComponent(name, lazyImport, {
    loading: LoadingModalFullScreen,
    error: ErrorModal
  })
}

/*
This method of loading components is documented here and is used to ensure compatibility
with lazy-loaded routes:
https://github.com/vuejs/vue-router/pull/2140/files#diff-7d999265ce5b22152fdffee108ca6385

WARNING: Components loaded with this strategy will **not** have access to in-component guards,
such as `beforeRouteEnter`, `beforeRouteUpdate`, and `beforeRouteLeave`. If you need to use
these, you must either use route-level guards instead or lazy-load the component directly, without
handling loading state.
*/
export function lazyPage (
  lazyImport: LazyImport,
  { loading = LoadingPage, error = ErrorPage }: Object = {}
): Function {
  const handler = asyncHandler(lazyImport, { loading, error })

  return () => Promise.resolve({
    functional: true,
    render (h, { data, children }) {
      return h(handler, data, children)
    }
  })
}

lazyModal('ChatMembersAllModal', () => import('../views/containers/chatroom/ChatMembersAllModal.vue'))
lazyModal('CreateNewChannelModal', () => import('../views/containers/chatroom/CreateNewChannelModal.vue'))
lazyModal('DeleteChannelModal', () => import('../views/containers/chatroom/DeleteChannelModal.vue'))
lazyModal('EditChannelDescriptionModal', () => import('../views/containers/chatroom/EditChannelDescriptionModal.vue'))
lazyModal('EditChannelNameModal', () => import('../views/containers/chatroom/EditChannelNameModal.vue'))
lazyModal('GroupLeaveModal', () => import('../views/containers/group-settings/GroupLeaveModal.vue'))
lazyModal('GroupDeletionModal', () => import('../views/containers/group-settings/GroupDeletionModal.vue'))
lazyModal('InvitationLinkModal', () => import('../views/containers/group-settings/InvitationLinkModal.vue'))
lazyModal('LeaveChannelModal', () => import('../views/containers/chatroom/LeaveChannelModal.vue'))
lazyModal('LoginModal', () => import('../views/containers/access/LoginModal.vue'))
lazyModal('NotificationModal', () => import('../views/containers/notifications/NotificationModal.vue'))
lazyModal('PasswordModal', () => import('../views/containers/access/PasswordModal.vue'))
lazyModal('SignupModal', () => import('../views/containers/access/SignupModal.vue'))
lazyModal('Prompt', () => import('../views/components/modal/Prompt.vue'))
lazyModalFullScreen('GroupCreationModal', () => import('../views/containers/group-settings/GroupCreationModal.vue'))
lazyModalFullScreen('GroupJoinModal', () => import('../views/containers/group-settings/GroupJoinModal.vue'))
lazyModalFullScreen('GroupMembersAllModal', () => import('../views/containers/dashboard/GroupMembersAllModal.vue'))
lazyModalFullScreen('IncomeDetails', () => import('../views/containers/contributions/IncomeDetails.vue'))
lazyModalFullScreen('UserSettingsModal', () => import('../views/containers/user-settings/UserSettingsModal.vue'))

lazyComponent('AddMembers', () => import('../views/containers/proposals/AddMembers.vue'))
lazyComponent('ChangeVotingRules', () => import('../views/containers/proposals/ChangeVotingRules.vue'))
lazyComponent('MincomeProposal', () => import('../views/containers/proposals/Mincome.vue'))
lazyComponent('PaymentsHistoryModal', () => import('../views/containers/payments/PaymentsHistoryModal.vue'))
lazyComponent('RemoveMember', () => import('../views/containers/proposals/RemoveMember.vue'))
lazyModalFullScreen('PropositionsAllModal', () => import('../views/containers/proposals/PropositionsAllModal.vue'))

lazyComponent('PaymentDetail', () => import('../views/containers/payments/PaymentDetail.vue'))
lazyComponent('RecordPayment', () => import('../views/containers/payments/RecordPayment.vue'))

lazyComponent('Appearence', () => import('../views/containers/user-settings/Appearence.vue'))
lazyComponent('NotificationSettings', () => import('../views/containers/user-settings/NotificationSettings.vue'))
lazyComponent('AppLogs', () => import('../views/containers/user-settings/AppLogs.vue'))
lazyComponent('GroupMembersDirectMessages', () => import('../views/containers/chatroom/GroupMembersDirectMessages.vue'))
lazyComponent('Placeholder', () => import('../views/containers/user-settings/Placeholder.vue'))
lazyComponent('Troubleshooting', () => import('../views/containers/user-settings/Troubleshooting.vue'))
lazyComponent('UserProfile', () => import('../views/containers/user-settings/UserProfile.vue'))

// TODO Remove after design test period.
lazyComponent('DSModalFullscreen', () => import('../views/containers/design-system/DSModalFullscreen.vue'))
lazyComponent('DSModalNested', () => import('../views/containers/design-system/DSModalNested.vue'))
lazyComponent('DSModalQuery', () => import('../views/containers/design-system/DSModalQuery.vue'))
// lazyComponent('TimeTravel', () => import('../views/containers/navigation/TimeTravel.vue'))
