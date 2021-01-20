/* eslint no-undef: "off", no-unused-vars: "off" */
// =======================
// This file prevents flow from bitching about globals and "Required module not found"
// https://github.com/facebook/flow/issues/2092#issuecomment-232917073
//
// Note that the modules can (and should) be properly fixed with flow-typed
// https://github.com/okTurtles/group-income-simple/issues/157
// =======================

// TODO: create a script in scripts/ to run flow via grunt-exec
//       and have it output (at the end of the run) helpful suggestions
//       like how to use `declare module` to ignore .vue requires,
//       and also a strong urging to not overdue the types because
//       FlowType is a little bit stupid and it can turn into a
//       banging-head-on-desk timesink (literally those words).
//       Have the script explain which files represent what.

// our globals
declare function logger(err: Error): void
// nodejs globals
declare var process: any

// =======================
// Fix "Required module not found" in a hackish way.
// TODO: Proper fix is to use:
// https://github.com/okTurtles/group-income-simple/issues/157
// =======================
declare module '@hapi/boom' { declare module.exports: any }
declare module '@hapi/hapi' { declare module.exports: any }
declare module '@hapi/inert' { declare module.exports: any }
declare module '@hapi/joi' { declare module.exports: any }
declare module 'blakejs' { declare module.exports: any }
declare module 'buffer' { declare module.exports: any }
declare module 'chalk' { declare module.exports: any }
declare module 'form-data' { declare module.exports: any }
declare module 'localforage' { declare module.exports: any }
declare module 'multihashes' { declare module.exports: any }
declare module 'primus' { declare module.exports: any }
declare module 'primus-responder' { declare module.exports: any }
declare module 'primus-rooms' { declare module.exports: any }
declare module 'scrypt-async' { declare module.exports: any }
declare module 'tweetnacl' { declare module.exports: any }
declare module 'tweetnacl-util' { declare module.exports: any }
declare module 'vue' { declare module.exports: any }
declare module 'vue-clickaway' { declare module.exports: any }
declare module 'vue-router' { declare module.exports: any }
declare module 'vue-slider-component' { declare module.exports: any }
declare module 'vuelidate' { declare module.exports: any }
declare module 'vuex' { declare module.exports: any }
declare module 'vue2-touch-events' { declare module.exports: any }
declare module 'wicg-inert' { declare module.exports: any }
declare module 'ws' { declare module.exports: any }

// .js files
declare module './primus.js' { declare module.exports: Function }
declare module '@utils/blockies.js' { declare module.exports: Object }
declare module '~/frontend/utils/flowTyper.js' { declare module.exports: Object }

// .vue files
declare module '../views/Contributions.vue' { declare module.exports: Object }
declare module '../views/CreateGroup.vue' { declare module.exports: Object }
declare module '../views/DesignSystem.vue' { declare module.exports: Object }
declare module '../views/GroupChat.vue' { declare module.exports: Object }
declare module '../views/GroupDashboard.vue' { declare module.exports: Object }
declare module '../views/Home.vue' { declare module.exports: Object }
declare module '../views/Join.vue' { declare module.exports: Object }
declare module '../views/Mailbox.vue' { declare module.exports: Object }
declare module '../views/Messages.vue' { declare module.exports: Object }
declare module '../views/Payments.vue' { declare module.exports: Object }
declare module '../views/ProposeMember.vue' { declare module.exports: Object }
declare module '../views/UserGroup.vue' { declare module.exports: Object }
declare module '../views/UserProfile.vue' { declare module.exports: Object }
declare module '../views/VueAssistant.vue' { declare module.exports: Object }
declare module '../views/components/modal/Modal.vue' { declare module.exports: Object }
declare module '../views/containers/access/LoginModal.vue' { declare module.exports: Object }
declare module '../views/containers/access/PasswordModal.vue' { declare module.exports: Object }
declare module '../views/containers/access/SignupModal.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/CreateNewChannelModal.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/DeleteChannelModal.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/EditChannelDescriptionModal.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/EditChannelModal.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/EditChannelNameModal.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/GroupMembersDirectMessages.vue' { declare module.exports: Object }
declare module '../views/containers/chatroom/LeaveChannelModal.vue' { declare module.exports: Object }
declare module '../views/containers/contributions/IncomeDetails.vue' { declare module.exports: Object }
declare module '../views/containers/dashboard/GroupMembersAllModal.vue' { declare module.exports: Object }
declare module '../views/containers/design-system/DSModalFullscreen.vue' { declare module.exports: Object }
declare module '../views/containers/design-system/DSModalNested.vue' { declare module.exports: Object }
declare module '../views/containers/design-system/DSModalQuery.vue' { declare module.exports: Object }
declare module '../views/containers/design-system/DSModalSimple.vue' { declare module.exports: Object }
declare module '../views/containers/group-settings/GroupCreationModal.vue' { declare module.exports: Object }
declare module '../views/containers/group-settings/GroupDeletionModal.vue' { declare module.exports: Object }
declare module '../views/containers/group-settings/GroupJoinModal.vue' { declare module.exports: Object }
declare module '../views/containers/group-settings/GroupLeaveModal.vue' { declare module.exports: Object }
declare module '../views/containers/group-settings/InvitationLinkModal.vue' { declare module.exports: Object }
declare module '../views/containers/navigation/CypressBypassUI.vue' { declare module.exports: Object }
declare module '../views/containers/navigation/TimeTravel.vue' { declare module.exports: Object }
declare module '../views/containers/payments/PaymentDetail.vue' { declare module.exports: Object }
declare module '../views/containers/payments/PaymentsHistoryModal.vue' { declare module.exports: Object }
declare module '../views/containers/payments/RecordPayment.vue' { declare module.exports: Object }
declare module '../views/containers/proposals/AddMember.vue' { declare module.exports: Object }
declare module '../views/containers/proposals/AddMembers.vue' { declare module.exports: Object }
declare module '../views/containers/proposals/ChangeVotingRules.vue' { declare module.exports: Object }
declare module '../views/containers/proposals/Mincome.vue' { declare module.exports: Object }
declare module '../views/containers/proposals/RemoveMember.vue' { declare module.exports: Object }
declare module '../views/containers/user-settings/AppLogs.vue' { declare module.exports: Object }
declare module '../views/containers/user-settings/Appearence.vue' { declare module.exports: Object }
declare module '../views/containers/user-settings/Placeholder.vue' { declare module.exports: Object }
declare module '../views/containers/user-settings/Troubleshooting.vue' { declare module.exports: Object }
declare module '../views/containers/user-settings/UserProfile.vue' { declare module.exports: Object }
declare module '../views/containers/user-settings/UserSettingsModal.vue' { declare module.exports: Object }
declare module '../views/pages/ErrorTesting.vue' { declare module.exports: Object }
declare module './Bars.vue' { declare module.exports: Object }
declare module './ButtonCountdown.vue' { declare module.exports: Object }
declare module './ConfettiCircle.vue' { declare module.exports: Object }
declare module './ConfettiLogo.vue' { declare module.exports: Object }
declare module './ConfettiRectangle.vue' { declare module.exports: Object }
declare module './ConfettiTriangle.vue' { declare module.exports: Object }
declare module './GraphLegendGroup.vue' { declare module.exports: Object }
declare module './GraphLegendItem.vue' { declare module.exports: Object }
declare module './GroupMincome.vue' { declare module.exports: Object }
declare module './GroupName.vue' { declare module.exports: Object }
declare module './GroupPrivacy.vue' { declare module.exports: Object }
declare module './GroupPurpose.vue' { declare module.exports: Object }
declare module './GroupRules.vue' { declare module.exports: Object }
declare module './MaskToModal.vue' { declare module.exports: Object }
declare module './Masker.vue' { declare module.exports: Object }
declare module './MenuContent.vue' { declare module.exports: Object }
declare module './MenuHeader.vue' { declare module.exports: Object }
declare module './MenuItem.vue' { declare module.exports: Object }
declare module './MenuParent.vue' { declare module.exports: Object }
declare module './MenuTrigger.vue' { declare module.exports: Object }
declare module './ModalClose.vue' { declare module.exports: Object }
declare module './PieChart.vue' { declare module.exports: Object }
declare module './Progress.vue' { declare module.exports: Object }
declare module './SupportHistory.vue' { declare module.exports: Object }
declare module './Target.vue' { declare module.exports: Object }
declare module './Trigger.vue' { declare module.exports: Object }
declare module './Voting.vue' { declare module.exports: Object }
declare module './views/Contributions.vue' { declare module.exports: Object }
declare module './views/CreateGroup.vue' { declare module.exports: Object }
declare module './views/DesignSystem.vue' { declare module.exports: Object }
declare module './views/GroupChat.vue' { declare module.exports: Object }
declare module './views/GroupDashboard.vue' { declare module.exports: Object }
declare module './views/Home.vue' { declare module.exports: Object }
declare module './views/Join.vue' { declare module.exports: Object }
declare module './views/Mailbox.vue' { declare module.exports: Object }
declare module './views/Messages.vue' { declare module.exports: Object }
declare module './views/Payments.vue' { declare module.exports: Object }
declare module './views/ProposeMember.vue' { declare module.exports: Object }
declare module './views/UserGroup.vue' { declare module.exports: Object }
declare module './views/UserProfile.vue' { declare module.exports: Object }
declare module './views/VueAssistant.vue' { declare module.exports: Object }
declare module './views/components/AppStyles.vue' { declare module.exports: Object }
declare module './views/components/Modal/Modal.vue' { declare module.exports: Object }
declare module './views/components/banners/BannerGeneral.vue' { declare module.exports: Object }
declare module './views/components/modal/Modal.vue' { declare module.exports: Object }
declare module './views/containers/LoginModal.vue' { declare module.exports: Object }
declare module './views/containers/Signup.vue' { declare module.exports: Object }
declare module './views/containers/access/LoginModal.vue' { declare module.exports: Object }
declare module './views/containers/access/PasswordModal.vue' { declare module.exports: Object }
declare module './views/containers/access/SignupModal.vue' { declare module.exports: Object }
declare module './views/containers/contributions/IncomeDetails.vue' { declare module.exports: Object }
declare module './views/containers/dashboard/GroupMembersAllModal.vue' { declare module.exports: Object }
declare module './views/containers/design-system/DSModalFullscreen.vue' { declare module.exports: Object }
declare module './views/containers/design-system/DSModalNested.vue' { declare module.exports: Object }
declare module './views/containers/design-system/DSModalQuery.vue' { declare module.exports: Object }
declare module './views/containers/design-system/DSModalSimple.vue' { declare module.exports: Object }
declare module './views/containers/group-settings/GroupCreationModal.vue' { declare module.exports: Object }
declare module './views/containers/group-settings/GroupJoinModal.vue' { declare module.exports: Object }
declare module './views/containers/group-settings/GroupLeaveModal.vue' { declare module.exports: Object }
declare module './views/containers/group-settings/InvitationLinkModal.vue' { declare module.exports: Object }
declare module './views/containers/navigation/CypressBypassUI.vue' { declare module.exports: Object }
declare module './views/containers/navigation/CypressBypassUI.vue' { declare module.exports: Object }
declare module './views/containers/navigation/Navigation.vue' { declare module.exports: Object }
declare module './views/containers/navigation/TimeTravel.vue' { declare module.exports: Object }
declare module './views/containers/payments/PaymentDetail.vue' { declare module.exports: Object }
declare module './views/containers/payments/PaymentsHistoryModal.vue' { declare module.exports: Object }
declare module './views/containers/payments/RecordPayment.vue' { declare module.exports: Object }
declare module './views/containers/proposals/AddMember.vue' { declare module.exports: Object }
declare module './views/containers/proposals/AddMembers.vue' { declare module.exports: Object }
declare module './views/containers/proposals/ChangeVotingRules.vue' { declare module.exports: Object }
declare module './views/containers/proposals/ChangeVotingRules.vue' { declare module.exports: Object }
declare module './views/containers/proposals/Mincome.vue' { declare module.exports: Object }
declare module './views/containers/proposals/RemoveMember.vue' { declare module.exports: Object }
declare module './views/containers/proposals/RuleAddMember.vue' { declare module.exports: Object }
declare module './views/containers/proposals/RuleRemoveMember.vue' { declare module.exports: Object }
declare module './views/containers/sidebar/Sidebar.vue' { declare module.exports: Object }
declare module './views/containers/user-settings/AppLogs.vue' { declare module.exports: Object }
declare module './views/containers/user-settings/Appearance.vue' { declare module.exports: Object }
declare module './views/containers/user-settings/Placeholder.vue' { declare module.exports: Object }
declare module './views/containers/user-settings/Troubleshooting.vue' { declare module.exports: Object }
declare module './views/containers/user-settings/UserProfile.vue' { declare module.exports: Object }
declare module './views/containers/user-settings/UserSettingsModal.vue' { declare module.exports: Object }
declare module '@components/ListItem.vue' { declare module.exports: Object }
declare module '@components/MembersCircle.vue' { declare module.exports: Object }
declare module '@components/i18n.vue' { declare module.exports: Object }
declare module '@pages/BypassUI.vue' { declare module.exports: Object }
declare module '@pages/Contributions.vue' { declare module.exports: Object }
declare module '@pages/DesignSystem.vue' { declare module.exports: Object }
declare module '@pages/GroupChat.vue' { declare module.exports: Object }
declare module '@pages/GroupDashboard.vue' { declare module.exports: Object }
declare module '@pages/GroupSettings.vue' { declare module.exports: Object }
declare module '@pages/Home.vue' { declare module.exports: Object }
declare module '@pages/Join.vue' { declare module.exports: Object }
declare module '@pages/Mailbox.vue' { declare module.exports: Object }
declare module '@pages/Messages.vue' { declare module.exports: Object }
declare module '@pages/Payments.vue' { declare module.exports: Object }
declare module '@views/containers/loading-error/ErrorModal.vue' { declare module.exports: Object }
declare module '@views/containers/loading-error/ErrorPage.vue' { declare module.exports: Object }
declare module '@views/containers/loading-error/LoadingBaseModal.vue' { declare module.exports: Object }
declare module '@views/containers/loading-error/LoadingModal.vue' { declare module.exports: Object }
declare module '@views/containers/loading-error/LoadingPage.vue' { declare module.exports: Object }
