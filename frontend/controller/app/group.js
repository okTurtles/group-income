'use strict'

import { L } from '@common/common.js'
import {
  INVITE_INITIAL_CREATOR,
  MAX_GROUP_MEMBER_COUNT,
  PROFILE_STATUS
} from '@model/contracts/shared/constants.js'
import sbp from '@sbp/sbp'
import { ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST, ERROR_JOINING_CHATROOM, JOINED_GROUP, LEFT_GROUP, NEW_LAST_LOGGED_IN, OPEN_MODAL, REPLACE_MODAL, SWITCH_GROUP } from '@utils/events.js'
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import type { ChelKeyRequestParams } from 'libchelonia'
import type { GIActionParams } from '../actions/types.js'

sbp('okTurtles.events/on', ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST, ({ identityContractID, groupContractID }) => {
  if (process.env.CI) {
    // Force a Cypress error
    console.error('Error ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST', { identityContractID, groupContractID })
    Promise.reject(new Error('ERROR_GROUP_GENERAL_CHATROOM_DOES_NOT_EXIST'))
  }
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return

  sbp('chelonia/contract/wait', groupContractID).then(() => {
    const ourGroups = sbp('state/vuex/getters').ourGroups
    if (!ourGroups.includes(groupContractID)) return

    const rootState = sbp('state/vuex/state')
    if (!rootState[groupContractID].generalChatRoomId) {
      sbp('gi.ui/prompt', {
        heading: L('Error joining the #general chatroom'),
        question: L('There was an error joining the #general chatroom because it doesn\'t exist'),
        primaryButton: L('Close')
      })
    }
  })
})

sbp('okTurtles.events/on', ERROR_JOINING_CHATROOM, ({ identityContractID, groupContractID, chatRoomID }) => {
  if (process.env.CI) {
    // Force a Cypress error
    console.error('Error ERROR_JOINING_CHATROOM', { identityContractID, groupContractID, chatRoomID })
    Promise.reject(new Error('ERROR_JOINING_CHATROOM'))
  }
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return

  sbp('chelonia/contract/wait', groupContractID).then(() => {
    const ourGroups = sbp('state/vuex/getters').ourGroups
    if (!ourGroups.includes(groupContractID)) return

    const rootState = sbp('state/vuex/state')
    if (
      rootState[groupContractID].chatRooms[chatRoomID]?.members[identityContractID]?.status === PROFILE_STATUS.ACTIVE &&
      !rootState[chatRoomID]?.members[identityContractID]
    ) {
      sbp('gi.ui/prompt', {
        heading: L('Error joining chatroom'),
        question: L('There was an error joining the {chatRoomName} chatroom', {
          chatRoomName: rootState[groupContractID].chatRooms[chatRoomID]?.name
            ? `#${rootState[groupContractID].chatRooms[chatRoomID].name}`
            : L('(unknown)')
        }),
        primaryButton: L('Close')
      })
    }
  })
})

// handle incoming group-related events that are sent from the service worker
sbp('okTurtles.events/on', JOINED_GROUP, ({ identityContractID, groupContractID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  if (!rootState[groupContractID]) return
  if (!rootState.currentGroupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupContractID })
    sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
  }
})

sbp('okTurtles.events/on', LEFT_GROUP, ({ identityContractID, groupContractID }) => {
  const rootState = sbp('state/vuex/state')
  if (rootState.loggedIn?.identityContractID !== identityContractID) return
  const state = rootState[identityContractID]
  // grab the groupID of any group that we're a part of
  const currentGroupId = rootState.currentGroupId
  if (!currentGroupId || currentGroupId === groupContractID) {
    const groupIdToSwitch = Object.entries(state.groups)
      // $FlowFixMe[incompatible-use]
      .map(([cID, { hasLeft }]) => !hasLeft && cID)
      .filter(cID =>
        cID && cID !== groupContractID
      ).sort(cID =>
      // prefer successfully joined groups
        sbp('state/vuex/state')[cID]?.profiles?.[groupContractID] ? -1 : 1
      )[0] || null
    sbp('state/vuex/commit', 'setCurrentChatRoomId', {})
    // If currentGroupId === groupContractID (i.e., if the current group is
    // the one being left), we set `forceRefresh` to force a redirect to the
    // dashboard route. This closes the modal for leaving a group if it was
    // open.
    sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupIdToSwitch, forceRefresh: currentGroupId === groupContractID })
  }
})

sbp('okTurtles.events/on', NEW_LAST_LOGGED_IN, ([contractID, data]) => {
  sbp('state/vuex/commit', 'setLastLoggedIn', [contractID, data])
})

export default (sbp('sbp/selectors/register', {
  'gi.app/group/createAndSwitch': async function (params: GIActionParams) {
    const contractID = await sbp('gi.actions/group/create', params)
    sbp('gi.app/group/switch', contractID, true)
    return contractID
  },
  'gi.app/group/switch': function (groupId, isNewlyCreated) {
    sbp('okTurtles.events/emit', SWITCH_GROUP, { contractID: groupId, isNewlyCreated })
    sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: groupId, isNewlyCreated })
  },
  'gi.app/group/joinAndSwitch': async function (params: $Exact<ChelKeyRequestParams>) {
    await sbp('gi.actions/group/join', params)
    // after joining, we can set the current group
    return sbp('gi.app/group/switch', params.contractID, true)
  },
  'gi.app/group/joinWithInviteSecret': async function (groupId: string, secret: string) {
    const result = await sbp('gi.actions/group/joinWithInviteSecret', groupId, secret)
    sbp('gi.app/group/switch', groupId, true)
    return result
  },
  'gi.app/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    const chatRoomID = await sbp('gi.actions/group/addAndJoinChatRoom', params)
    // For an explanation about 'setPendingChatRoomId', see DMMixin.js
    // TL;DR: This is an intermediary state to avoid untimely navigation before
    // the contract state is available.
    sbp('state/vuex/commit', 'setPendingChatRoomId', { chatRoomID, groupID: params.contractID })
    return chatRoomID
  },
  'gi.app/group/checkGroupSizeAndProposeMember': async function () {
    // if current size of the group is >= 150, display a warning prompt first before presenting the user with
    // 'AddMembers' proposal modal.

    const enforceDunbar = true // Context for this hard-coded boolean variable: https://github.com/okTurtles/group-income/pull/1648#discussion_r1230389924
    const { groupMembersCount, currentGroupState } = sbp('state/vuex/getters')
    const memberInvitesCount = Object.values(currentGroupState.invites || {}).filter((invite: any) => invite.creatorID !== INVITE_INITIAL_CREATOR).length
    const isGroupSizeLarge = (groupMembersCount + memberInvitesCount) >= MAX_GROUP_MEMBER_COUNT

    if (isGroupSizeLarge) {
      const translationArgs = {
        a_: `<a class='link' href='${ALLOWED_URLS.WIKIPEDIA_DUNBARS_NUMBER}' target='_blank'>`,
        _a: '</a>'
      }
      const promptConfig = enforceDunbar
        ? {
            heading: 'Large group size',
            question: L("Group sizes are limited to {a_}Dunbar's Number{_a} to prevent fraud.", translationArgs),
            primaryButton: L('OK')
          }
        : {
            heading: 'Large group size',
            question: L("Groups over 150 members are at significant risk for fraud, {a_}because it is difficult to verify everyone's identity.{_a} Are you sure that you want to add more members?", translationArgs),
            primaryButton: L('Yes'),
            secondaryButton: L('Cancel')
          }

      const primaryButtonSelected = await sbp('gi.ui/prompt', promptConfig)
      if (!enforceDunbar && primaryButtonSelected) {
        sbp('okTurtles.events/emit', REPLACE_MODAL, 'AddMembers')
      } else return false
    } else {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'AddMembers')
    }
  },
  'gi.app/group/checkAndSeeProposal': function ({ contractID, data }: GIActionParams) {
    const rootGetters = sbp('state/vuex/getters')
    const rootState = sbp('state/vuex/state')
    if (rootState.currentGroupId !== contractID) {
      sbp('state/vuex/commit', 'setCurrentGroupId', { contractID })
    }

    const openProposalIds = Object.keys(rootGetters.currentGroupState.proposals || {})

    if (openProposalIds.includes(data.proposalHash)) {
      sbp('controller/router').push({ path: '/dashboard#proposals' })
    } else {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'PropositionsAllModal', { targetProposal: data.proposalHash })
    }
  },
  'gi.app/group/displayMincomeChangedPrompt': async function ({ contractID, data }: GIActionParams) {
    const rootGetters = sbp('state/vuex/getters')
    const rootState = sbp('state/vuex/state')
    if (rootState.currentGroupId !== contractID) {
      sbp('state/vuex/commit', 'setCurrentGroupId', { contractID })
    }

    const { withGroupCurrency } = rootGetters
    const promptOptions = data.increased
      ? {
          heading: L('Mincome changed'),
          question: L('Do you make at least {amount} per month?', { amount: withGroupCurrency(data.amount) }),
          primaryButton: data.memberType === 'pledging' ? L('No') : L('Yes'),
          secondaryButton: data.memberType === 'pledging' ? L('Yes') : L('No')
        }
      : {
          heading: L('Automatically switched to pledging {zero}', { zero: withGroupCurrency(0) }),
          question: L('You now make more than the mincome. Would you like to increase your pledge?'),
          primaryButton: L('Yes'),
          secondaryButton: L('No')
        }

    const primaryButtonSelected = await sbp('gi.ui/prompt', promptOptions)
    if (primaryButtonSelected) {
      // NOTE: emtting 'REPLACE_MODAL' instead of 'OPEN_MODAL' here because 'Prompt' modal is open at this point (by 'gi.ui/prompt' action above).
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'IncomeDetails')
    }
  }
}): string[])
