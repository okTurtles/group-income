'use strict'

import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import {
  CHATROOM_GENERAL_NAME,
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_TYPES,
  INVITE_EXPIRES_IN_DAYS,
  INVITE_INITIAL_CREATOR,
  MAX_GROUP_MEMBER_COUNT,
  MESSAGE_TYPES,
  PROPOSAL_GENERIC,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_VARIANTS,
  STATUS_OPEN
} from '@model/contracts/shared/constants.js'
import { merge, omit, randomIntFromRange } from '@model/contracts/shared/giLodash.js'
import { addTimeToDate, dateToPeriodStamp, DAYS_MILLIS } from '@model/contracts/shared/time.js'
import proposals from '@model/contracts/shared/voting/proposals.js'
import { VOTE_FOR } from '@model/contracts/shared/voting/rules.js'
import sbp from '@sbp/sbp'
import { OPEN_MODAL, REPLACE_MODAL, SWITCH_GROUP } from '@utils/events.js'
import { imageUpload } from '@utils/image.js'
import { GIMessage } from '~/shared/domains/chelonia/chelonia.js'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '~/shared/domains/chelonia/encryptedData.js'
import { CONTRACT_HAS_RECEIVED_KEYS } from '~/shared/domains/chelonia/events.js'
// Using relative path to crypto.js instead of ~-path to workaround some esbuild bug
import ALLOWED_URLS from '@view-utils/allowedUrls.js'
import type { ChelKeyRequestParams } from '~/shared/domains/chelonia/chelonia.js'
import type { Key } from '../../../shared/domains/chelonia/crypto.js'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, keygen, keyId, serializeKey } from '../../../shared/domains/chelonia/crypto.js'
import type { GIActionParams } from './types.js'
import { encryptedAction } from './utils.js'

export async function leaveAllChatRooms (groupContractID: string, member: string) {
  // let user leaves all the chatrooms before leaving group
  const rootState = sbp('state/vuex/state')
  const chatRooms = rootState[groupContractID].chatRooms
  const chatRoomIDsToLeave = Object.keys(chatRooms)
    .filter(cID => chatRooms[cID].users.includes(member))

  try {
    for (const chatRoomID of chatRoomIDsToLeave) {
      await sbp('gi.actions/group/leaveChatRoom', {
        contractID: groupContractID,
        data: { chatRoomID, member, leavingGroup: true }
      })
    }
  } catch (e) {
    console.error(`leaveAllChatRooms: ${e.name}: ${e.message}`, e)
    throw new GIErrorUIRuntimeError(L('Failed to leave chat channel.'))
  }
}

async function saveLoginState (action: string, contractID: string) {
  try {
    await sbp('gi.actions/identity/saveOurLoginState')
  } catch (e) {
    console.error(`${e.name} trying to save our login state when ${action} group: ${contractID}: ${e.message}`, e)
  }
}

// TODO: Check if pendingKeys gets sync simultanoeusly across devices
// Replace with event listener
// event onPendingKey requests
// event listener that signs up to chat

/*
sbp('chelonia/configure', {
  hooks: {
    postHandleEvent: (message: GIMessage) => {
      if (message.opType() === GIMessage.OP_KEYSHARE) {
        sbp('chelonia/contract/sync', message.originatingContractID()).then(() => {
          const state = sbp('state/vuex/state')

          const generalChatRoomId = state[message.originatingContractID()].generalChatRoomId

          sbp('gi.actions/group/joinChatRoom', {
            data: {
              chatRoomID: generalChatRoomId
            }
          })
        })
      }
    }
  }
})
*/

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/create': async function ({
    data: {
      name,
      picture,
      sharedValues,
      mincomeAmount,
      mincomeCurrency,
      ruleName,
      ruleThreshold,
      distributionDate
    },
    publishOptions
  }) {
    let finalPicture = `${window.location.origin}/assets/images/group-avatar-default.png`

    if (picture) {
      try {
        finalPicture = await imageUpload(picture)
      } catch (e) {
        console.error('actions/group.js failed to upload the group picture', e)
        throw new GIErrorUIRuntimeError(L('Failed to upload the group picture. {codeError}', { codeError: e.message }))
      }
    }

    // Create the necessary keys to initialise the contract
    // eslint-disable-next-line camelcase
    const CSK = keygen(EDWARDS25519SHA512BATCH)
    const CEK = keygen(CURVE25519XSALSA20POLY1305)
    const inviteKey = keygen(EDWARDS25519SHA512BATCH)

    // Key IDs
    const CSKid = keyId(CSK)
    const CEKid = keyId(CEK)
    const inviteKeyId = keyId(inviteKey)

    // Public keys to be stored in the contract
    const CSKp = serializeKey(CSK, false)
    const CEKp = serializeKey(CEK, false)
    const inviteKeyP = serializeKey(inviteKey, false)

    // Secret keys to be stored encrypted in the contract
    const CSKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CSK, true))
    const CEKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CEK, true))
    const inviteKeyS = encryptedOutgoingDataWithRawKey(CEK, serializeKey(inviteKey, true))

    const rootState = sbp('state/vuex/state')

    try {
      const proposalSettings = {
        rule: ruleName,
        ruleSettings: {
          [ruleName]: {
            threshold: +ruleThreshold // ensure this is a number
          }
        }
      }
      if (!distributionDate) {
        // 3 days after group creation by default. we put this here for a kind of dumb but
        // necessary reason: the Cypress tests do not allow us to import dateToPeriodStamp
        // or any of these other time.js functions because thte Cypress environment can't
        // handle Flowtype annotations, even though our .babelrc should make it work.
        distributionDate = dateToPeriodStamp(addTimeToDate(new Date(), 3 * DAYS_MILLIS))
      }

      // Before creating the contract, put all keys into transient store
      sbp('chelonia/storeSecretKeys',
        [CEK, CSK].map(key => ({ key, transient: true }))
      )

      const message = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/group',
        publishOptions,
        signingKeyId: CSKid,
        actionSigningKeyId: CSKid,
        actionEncryptionKeyId: CEKid,
        keys: [
          {
            id: CSKid,
            name: 'csk',
            purpose: ['sig'],
            ringLevel: 1,
            permissions: '*',
            allowedActions: '*',
            meta: {
              private: {
                content: CSKs,
                shareable: true
              }
            },
            data: CSKp
          },
          {
            id: CEKid,
            name: 'cek',
            purpose: ['enc'],
            ringLevel: 1,
            permissions: [GIMessage.OP_ACTION_ENCRYPTED, GIMessage.OP_KEY_SHARE],
            allowedActions: '*',
            meta: {
              private: {
                content: CEKs,
                shareable: true
              }
            },
            data: CEKp
          },
          {
            id: inviteKeyId,
            name: '#inviteKey-' + inviteKeyId,
            purpose: ['sig'],
            ringLevel: Number.MAX_SAFE_INTEGER,
            permissions: [GIMessage.OP_KEY_REQUEST],
            meta: {
              quantity: 60,
              expires: Date.now() + DAYS_MILLIS * INVITE_EXPIRES_IN_DAYS.ON_BOARDING,
              private: {
                content: inviteKeyS
              }
            },
            data: inviteKeyP
          }
        ],
        data: {
          settings: {
            // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
            groupName: name,
            groupPicture: finalPicture,
            sharedValues,
            mincomeAmount: +mincomeAmount,
            mincomeCurrency: mincomeCurrency,
            distributionDate,
            minimizeDistribution: true,
            proposals: {
              [PROPOSAL_GROUP_SETTING_CHANGE]: merge(
                merge({}, proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults),
                proposalSettings
              ),
              [PROPOSAL_INVITE_MEMBER]: merge(
                merge({}, proposals[PROPOSAL_INVITE_MEMBER].defaults),
                proposalSettings
              ),
              [PROPOSAL_REMOVE_MEMBER]: merge(
                merge({}, proposals[PROPOSAL_REMOVE_MEMBER].defaults),
                proposalSettings
              ),
              [PROPOSAL_PROPOSAL_SETTING_CHANGE]: merge(
                merge({}, proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].defaults),
                proposalSettings
              ),
              [PROPOSAL_GENERIC]: merge(
                merge({}, proposals[PROPOSAL_GENERIC].defaults),
                proposalSettings
              )
            }
          }
        }
      })

      const contractID = message.contractID()

      // After the contract has been created, store pesistent keys
      sbp('chelonia/storeSecretKeys',
        [CEK, CSK, inviteKey].map(key => ({ key }))
      )

      await sbp('chelonia/contract/sync', contractID)
      saveLoginState('creating', contractID)

      // Save the initial invite
      await sbp('gi.actions/group/invite', {
        contractID,
        data: {
          inviteKeyId,
          creator: INVITE_INITIAL_CREATOR
        }
      })

      // create a 'General' chatroom contract and let the creator join
      await sbp('gi.actions/group/addAndJoinChatRoom', {
        contractID,
        data: {
          attributes: {
            name: CHATROOM_GENERAL_NAME,
            type: CHATROOM_TYPES.GROUP,
            description: '',
            privacyLevel: CHATROOM_PRIVACY_LEVEL.GROUP
          }
        },
        signingKeyId: CSKid,
        encryptionKeyId: CEKid
      })

      const userID = rootState.loggedIn.identityContractID

      // As the group's creator, we share the group secret keys with
      // ourselves, which we need to do be able to sync the group with a
      // fresh session.
      // This is a special case, as normally these keys would be shared using
      // invites
      await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: userID,
        contractName: 'gi.contracts/identity',
        subjectContractID: contractID,
        keyIds: '*'
      })

      // Add the group's CSK to our identity contract so that we can receive
      // key rotation updates and DMs.
      await sbp('chelonia/out/keyAdd', {
        contractID: userID,
        contractName: 'gi.contracts/identity',
        data: [{
          foreignKey: `sp:${encodeURIComponent(contractID)}?keyName=${encodeURIComponent('csk')}`,
          id: CSKid,
          data: CSKp,
          // The OP_ACTION_ENCRYPTED is necessary to let the DM counterparty
          // that a chatroom has just been created
          permissions: [GIMessage.OP_KEY_SHARE, GIMessage.OP_ACTION_ENCRYPTED],
          allowedActions: ['gi.contracts/identity/joinDirectMessage'],
          purpose: ['sig'],
          ringLevel: Number.MAX_SAFE_INTEGER,
          name: `${contractID}/${CSKid}`
        }],
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')
      })

      // Share our PEK with the group so that group members can see
      // our name and profile information
      const keyIds = sbp('chelonia/contract/historicalKeyIdsByName', userID, 'pek')

      keyIds.length && await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: contractID,
        contractName: 'gi.contracts/group',
        subjectContractID: userID,
        keyIds: keyIds
      })

      return message
    } catch (e) {
      console.error('gi.actions/group/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create the group: {reportError}', LError(e)))
    }
  },
  'gi.actions/group/createAndSwitch': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/group/create', params)
    sbp('gi.actions/group/switch', message.contractID())
    return message
  },
  // The 'gi.actions/group/join' selector handles joining a group. It can be
  // called from a variety of places: when accepting an invite, when logging
  // in, and asynchronously with an event handler defined in this function.
  // The function deals mostly with the group's contract state, and there are
  // multiple scenarios that need to be considered.
  // For example, when joining a group through an invite link, we need to
  // first send a key request that an existing group member must answer.
  // Until the key request has been answered, we cannot interact with the
  // group.
  // Once the key request is answered, we call the inviteAccept action to add
  // our profile to the group and then join the General chatroom. At this point,
  // we can fully interact with the group as a member.
  // When logging in, the situation is similar to immediately after joining
  // through an invite link, in that we could be: (a) waiting for the group
  // secret keys to be shared with us, (b) ready to call the inviteAccept
  // action if we haven't done so yet (because we were previously waiting for
  // the keys), or (c) already a member and ready to interact with the group.
  'gi.actions/group/join': async function (params: $Exact<ChelKeyRequestParams> & { options?: { skipInviteAccept?: boolean } }) {
    sbp('okTurtles.data/set', 'JOINING_GROUP-' + params.contractID, true)
    try {
      const rootState = sbp('state/vuex/state')
      const username = rootState.loggedIn.username
      const userID = rootState.loggedIn.identityContractID

      console.log('@@@@@@@@ AT join for ' + params.contractID)

      await sbp('chelonia/contract/sync', params.contractID)
      if (rootState.contracts[params.contractID]?.type !== 'gi.contracts/group') {
        throw Error(`Contract ${params.contractID} is not a group`)
      }

      const state = rootState[params.contractID]

      // Have we got the secret keys to the group? If we haven't, we are not
      // able to participate in the group yet and may need to send a key
      // request.
      const hasSecretKeys = sbp('chelonia/contract/canPerformOperation', state, '*')
      // Do we need to send a key request?
      // If we don't have the group contract in our state and
      // params.originatingContractID is set, it means that we're joining
      // through an invite link, and we must send a key request to complete
      // the joining process.
      const sendKeyRequest = (!hasSecretKeys && params.originatingContractID)

      // If we are expecting to receive keys, set up an event listener
      // We are expecting to receive keys if:
      //   (a) we are about to send a key request; or
      //   (b) we have already sent a key request (!!pendingKeyRequests?.length)
      if (sendKeyRequest || sbp('chelonia/contract/isWaitingForKeyShare', state)) {
        console.log('@@@@@@@@ AT join[sendKeyRequest] for ' + params.contractID)

        // Event handler for continuing the join process if the keys are
        // shared with us during the current session
        const eventHandler = ({ contractID }) => {
          if (contractID !== params.contractID) {
            return
          }

          sbp('okTurtles.events/off', CONTRACT_HAS_RECEIVED_KEYS, eventHandler)
          // The event handler recursively calls this same selector
          // A different path should be taken, since te event handler
          // should be called after the key request has been answered
          // and processed
          sbp('gi.actions/group/join', params)
        }

        // The event handler is configured before sending the request
        // to avoid race conditions
        sbp('okTurtles.events/on', CONTRACT_HAS_RECEIVED_KEYS, eventHandler)
      }

      // After syncing the group contract, we send a key request
      if (sendKeyRequest) {
        // Send the key request
        await sbp('chelonia/out/keyRequest', {
          ...omit(params, ['options']),
          hooks: {
            prepublish: params.hooks?.prepublish,
            postpublish: null
          }
        })
        // Nothing left to do until the keys are received

      // Called after logging in or during an existing session from the event
      // handler above. It handles the tasks related to joining the group for
      // the first time (if that's the case) or just sets this group as the
      // current group.
      // This block must be run after having received the group's secret keys
      // (i.e., the CSK and the CEK) that were requested earlier.
      } else if (hasSecretKeys && !sbp('chelonia/contract/isWaitingForKeyShare', state)) {
        console.log('@@@@@@@@ AT join[firstTimeJoin] for ' + params.contractID)

        // We're joining for the first time
        // In this case, we share our profile key with the group, call the
        // inviteAccept action and join the General chatroom
        if (!state.profiles?.[username] || state.profiles[username].departedDate) {
          const generalChatRoomId = rootState[params.contractID].generalChatRoomId

          // Share our PEK with the group so that group members can see
          // our name and profile information
          const PEKid = sbp('chelonia/contract/currentKeyIdByName', userID, 'pek')

          PEKid && await sbp('gi.actions/out/shareVolatileKeys', {
            contractID: params.contractID,
            contractName: 'gi.contracts/group',
            subjectContractID: userID,
            keyIds: [PEKid]
          })

          // Send inviteAccept action to the group to add ourselves to the
          // members list
          await sbp('gi.actions/group/inviteAccept', {
            ...omit(params, ['options', 'action', 'hooks']),
            hooks: {
              prepublish: params.hooks?.prepublish,
              postpublish: null
            }
          })

          const CSKid = sbp('chelonia/contract/currentKeyIdByName', params.contractID, 'csk')

          // Add the group's CSK to our identity contract so that we can receive
          // key rotation updates and DMs.
          await sbp('chelonia/out/keyUpdate', {
            contractID: userID,
            contractName: 'gi.contracts/identity',
            data: [{
              name: rootState[userID]._vm.authorizedKeys[CSKid].name,
              oldKeyId: CSKid,
              // The OP_ACTION_ENCRYPTED is necessary to let the DM counterparty
              // that a chatroom has just been created
              permissions: [GIMessage.OP_KEY_SHARE, GIMessage.OP_ACTION_ENCRYPTED],
              allowedActions: ['gi.contracts/identity/joinDirectMessage']
            }],
            signingKeyId: sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')
          })

          if (generalChatRoomId) {
            // Join the general chatroom
            await sbp('gi.actions/group/joinChatRoom', {
              ...omit(params, ['options', 'data', 'hooks']),
              data: {
                chatRoomID: generalChatRoomId
              },
              hooks: {
                prepublish: null,
                postpublish: params.hooks?.postpublish
              }
            })
          } else {
            // setTimeout to avoid blocking the main thread
            setTimeout(() => {
              alert(L("Couldn't join the #{chatroomName} in the group. Doesn't exist.", { chatroomName: CHATROOM_GENERAL_NAME }))
            }, 0)
          }

          if (rootState.currentGroupId === params.contractID) {
            await sbp('gi.actions/group/updateLastLoggedIn', { contractID: params.contractID })
          }

        // We are already a member of the group and have already called
        // inviteAccept
        } else {
          // Sync chatroom contracts he already joined
          // if he tries to login in another device, he should skip to make any
          // actions but he should sync all the contracts he was syncing in the
          // previous device
          console.log('@@@@@@@@ AT join[alreadyMember] for ' + params.contractID)
          // We've already joined
          const chatRoomIds = Object.keys(rootState[params.contractID].chatRooms ?? {})
            .filter(cId => (rootState[params.contractID].chatRooms?.[cId].users.includes(username)))

          await sbp('chelonia/contract/sync', chatRoomIds)
          sbp('state/vuex/commit', 'setCurrentChatRoomId', {
            groupId: params.contractID,
            chatRoomId: rootState[params.contractID].generalChatRoomId
          })
        }

        sbp('okTurtles.data/set', 'JOINING_GROUP-' + params.contractID, false)
      // We have already sent a key request that hasn't been answered. We cannot
      // do much at this point, so we do nothing.
      // This could happen, for example, after logging in if we still haven't
      // received a response to the key request.
      } else {
        console.info('Requested to join group but already waiting for OP_KEY_SHARE. contractID=' + params.contractID)
      }
    } catch (e) {
      console.error('gi.actions/group/join failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to join the group: {codeError}', { codeError: e.message }))
    } finally {
      saveLoginState('joining', params.contractID)
    }
  },
  'gi.actions/group/joinAndSwitch': async function (params: $Exact<ChelKeyRequestParams> & { options?: { skipInviteAccept: boolean } }) {
    await sbp('gi.actions/group/join', params)
    // after joining, we can set the current group
    sbp('gi.actions/group/switch', params.contractID)
  },
  'gi.actions/group/switch': function (groupId) {
    sbp('state/vuex/commit', 'setCurrentGroupId', groupId)
    sbp('okTurtles.events/emit', SWITCH_GROUP)
  },
  'gi.actions/group/shareNewKeys': (contractID: string, newKeys) => {
    const rootState = sbp('state/vuex/state')
    const state = rootState[contractID]

    // $FlowFixMe
    return Promise.all(
      Object.entries(state.profiles)
        .filter(([_, p]) => (p: any).departedDate == null)
        .map(async ([username]) => {
          const pContractID = await sbp('namespace/lookup', username)
          const CEKid = sbp('chelonia/contract/currentKeyIdByName', rootState[pContractID], 'cek')
          if (!CEKid) {
            console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: Missing CEK`)
            return Promise.resolve()
          }
          return {
            contractID,
            foreignContractID: pContractID,
            // $FlowFixMe
            keys: Object.values(newKeys).map(([, newKey, newId]: [any, Key, string]) => ({
              id: newId,
              meta: {
                private: {
                  content: encryptedOutgoingData(rootState[pContractID], CEKid, serializeKey(newKey, true))
                }
              }
            }))
          }
        }))
  },
  ...encryptedAction('gi.actions/group/addChatRoom', L('Failed to add chat channel'), async function (sendMessage, params) {
    const rootState = sbp('state/vuex/state')
    const contractState = rootState[params.contractID]
    const userID = rootState.loggedIn.identityContractID
    for (const contractId in contractState.chatRooms) {
      if (params.data.attributes.name.toUpperCase() === contractState.chatRooms[contractId].name.toUpperCase()) {
        throw new GIErrorUIRuntimeError(L('Duplicate channel name'))
      }
    }

    let csk
    let cek

    // For 'public' and 'group' chatrooms, use the group's CSK and CEK
    if ([CHATROOM_PRIVACY_LEVEL.GROUP, CHATROOM_PRIVACY_LEVEL.PUBLIC].includes(params.data.attributes.privacyLevel)) {
      const cskId = sbp('chelonia/contract/currentKeyIdByName', contractState, 'csk')
      const cekId = sbp('chelonia/contract/currentKeyIdByName', contractState, 'cek')

      csk = {
        id: cskId,
        foreignKey: `sp:${encodeURIComponent(params.contractID)}?keyName=${encodeURIComponent('csk')}`,
        data: contractState._vm.authorizedKeys[cskId].data
      }

      cek = {
        id: cekId,
        foreignKey: `sp:${encodeURIComponent(params.contractID)}?keyName=${encodeURIComponent('cek')}`,
        data: contractState._vm.authorizedKeys[cekId].data
      }
    }

    const message = await sbp('gi.actions/chatroom/create', {
      data: {
        ...params.data,
        attributes: {
          ...params.data?.attributes,
          groupContractID: params.contractID
        }
      },
      options: {
        ...params.options,
        csk,
        cek
      },
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    // When creating a public chatroom, that chatroom's secret keys are shared
    // with the group (i.e., they are literally the same keys, using the
    // foreignKey functionality). However, private chatrooms keep separate keys
    // which must be shared using OP_KEY_SHARE
    if (![CHATROOM_PRIVACY_LEVEL.GROUP, CHATROOM_PRIVACY_LEVEL.PUBLIC].includes(params.data.attributes.privacyLevel)) {
      await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: userID,
        contractName: 'gi.contracts/identity',
        subjectContractID: message.contractID(),
        keyIds: '*'
      })
    }

    await sendMessage({
      ...omit(params, ['options', 'action', 'data', 'hooks']),
      data: {
        ...params.data,
        chatRoomID: message.contractID()
      },
      hooks: {
        prepublish: null,
        postpublish: params.hooks?.postpublish
      }
    })

    return message
  }),
  ...encryptedAction('gi.actions/group/joinChatRoom', L('Failed to join chat channel.'), async function (sendMessage, params) {
    const rootState = sbp('state/vuex/state')
    const rootGetters = sbp('state/vuex/getters')
    const me = rootState.loggedIn.username
    const username = params.data.username || me

    if (!rootGetters.isJoinedChatRoom(params.data.chatRoomID) && username !== me) {
      throw new GIErrorUIRuntimeError(L('Only channel members can invite others to join.'))
    }

    // If we are inviting someone else to join, we need to share the chatroom's keys
    // with them so that they are able to read messages and participate
    if (username !== me && [CHATROOM_PRIVACY_LEVEL.PRIVATE].includes(rootState[params.data.chatRoomID].attributes.privacyLevel)) {
      await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: rootGetters.ourContactProfiles[username].contractID,
        contractName: 'gi.contracts/identity',
        originatingContractID: params.contractID,
        originatingContractName: 'gi.contracts/group',
        subjectContractID: params.data.chatRoomID,
        keyIds: '*'
      })
    }

    const message = await sbp('gi.actions/chatroom/join', {
      ...omit(params, ['options', 'contractID', 'data', 'hooks']),
      contractID: params.data.chatRoomID,
      data: { username },
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    if (username === me) {
      // 'JOINING_GROUP_CHAT' is necessary to identify the joining chatroom action is NEW or OLD
      // Users join the chatroom thru group making group actions
      // But when user joins the group, he needs to ignore all the actions about chatroom
      // Because the user is joining group, not joining chatroom
      // and he is going to make a new action to join 'General' chatroom AGAIN
      // While joining group, we don't set this flag because Joining chatroom actions are all OLD ones, which need to be ignored
      // Joining 'General' chatroom is one of the steps to join group
      // So setting 'JOINING_GROUP_CHAT' can not be out of the 'JOINING_GROUP' scope
      sbp('okTurtles.data/set', 'JOINING_GROUP_CHAT', true)
    }
    await sendMessage({
      ...omit(params, ['options', 'action', 'hooks']),
      hooks: {
        prepublish: null,
        postpublish: params.hooks?.postpublish
      }
    })
    return message
  }),
  'gi.actions/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    const message = await sbp('gi.actions/group/addChatRoom', {
      ...omit(params, ['options', 'hooks']),
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    await sbp('gi.actions/group/joinChatRoom', {
      ...omit(params, ['options', 'data', 'hooks']),
      data: {
        chatRoomID: message.contractID()
      },
      hooks: {
        prepublish: (msg) => {
          sbp('okTurtles.events/once', msg.hash(), (cId, m) => {
            sbp('state/vuex/commit', 'setCurrentChatRoomId', { chatRoomId: cId })
          })
        },
        postpublish: params.hooks?.postpublish
      }
    })

    return message
  },
  ...encryptedAction('gi.actions/group/renameChatRoom', L('Failed to rename chat channel.'), async function (sendMessage, params) {
    await sbp('gi.actions/chatroom/rename', {
      ...omit(params, ['options', 'contractID', 'data', 'hooks']),
      contractID: params.data.chatRoomID,
      data: {
        name: params.data.name
      },
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    return await sendMessage({
      ...omit(params, ['options', 'action', 'hooks']),
      hooks: {
        prepublish: null,
        postpublish: params.hooks?.postpublish
      }
    })
  }),
  ...encryptedAction('gi.actions/group/removeMember',
    (params, e) => L('Failed to remove {member}: {reportError}', { member: params.data.member, ...LError(e) }),
    async function (sendMessage, params, signingKeyId) {
      await leaveAllChatRooms(params.contractID, params.data.member)
      await sendMessage({
        ...omit(params, ['options', 'action'])
      })
    }),
  ...encryptedAction('gi.actions/group/removeOurselves',
    (e) => L('Failed to leave group. {codeError}', { codeError: e.message }),
    async function (sendMessage, params) {
      const rootState = sbp('state/vuex/state')
      await leaveAllChatRooms(params.contractID, rootState.loggedIn.username)
      return sendMessage({
        ...omit(params, ['options', 'action'])
      })
    }),
  ...encryptedAction('gi.actions/group/changeChatRoomDescription',
    L('Failed to update description of chat channel.'),
    async function (sendMessage, params: GIActionParams) {
      await sbp('gi.actions/chatroom/changeDescription', {
        ...omit(params, ['options', 'contractID', 'data', 'hooks']),
        contractID: params.data.chatRoomID,
        data: {
          description: params.data.description
        },
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })

      // NOTE: group contract should keep updated with all attributes of its chatrooms
      //       so that group members can check chatroom details whether or not they are part of
      return sendMessage({
        ...omit(params, ['options', 'action', 'hooks']),
        hooks: {
          prepublish: null,
          postpublish: params.hooks?.postpublish
        }
      })
    }),
  'gi.actions/group/autobanUser': async function (message: GIMessage, error: Object, attempt = 1) {
    try {
      if (attempt === 1) {
        // to decrease likelihood of multiple proposals being created at the same time, wait
        // a random amount of time on the first call
        setTimeout(() => {
          sbp('gi.actions/group/autobanUser', message, error, attempt + 1)
        }, randomIntFromRange(0, 5000))
        return
      }
      // If we just joined, we're likely witnessing an old error that was handled
      // by the existing members, so we shouldn't attempt to participate in voting
      // in a proposal that has long since passed.
      //
      // NOTE: we cast to 'any' to work around flow errors
      //       see: https://stackoverflow.com/a/41329247/1781435
      const { meta } = message.decryptedValue()
      const username = meta && meta.username
      const groupID = message.contractID()
      const contractState = sbp('state/vuex/state')[groupID]
      const getters = sbp('state/vuex/getters')
      if (username && getters.groupProfile(username)) {
        console.warn(`autoBanSenderOfMessage: autobanning ${username} from ${groupID}`)
        // find existing proposal if it exists
        let [proposalHash, proposal]: [string, ?Object] = Object.entries(contractState.proposals)
          .find(([hash, prop]: [string, Object]) => (
            prop.status === STATUS_OPEN &&
            prop.data.proposalType === PROPOSAL_REMOVE_MEMBER &&
            prop.data.proposalData.member === username
          )) ?? ['', undefined]
        if (proposal) {
          // cast our vote if we haven't already cast it
          if (!proposal.votes[getters.ourUsername]) {
            await sbp('gi.actions/group/proposalVote', {
              contractID: groupID,
              data: { proposalHash, vote: VOTE_FOR, passPayload: { secret: '' } },
              publishOptions: { maxAttempts: 3 }
            })
          }
        } else {
          // create our proposal to ban the user
          try {
            proposal = await sbp('gi.actions/group/proposal', {
              contractID: groupID,
              data: {
                proposalType: PROPOSAL_REMOVE_MEMBER,
                proposalData: {
                  member: username,
                  reason: L("Automated ban because they're sending malformed messages resulting in: {error}", { error: error.message }),
                  automated: true
                },
                votingRule: contractState.settings.proposals[PROPOSAL_REMOVE_MEMBER].rule,
                expires_date_ms: Date.now() + contractState.settings.proposals[PROPOSAL_REMOVE_MEMBER].expires_ms
              },
              publishOptions: { maxAttempts: 1 }
            })
          } catch (e) {
            if (attempt > 3) {
              console.error(`autoBanSenderOfMessage: max attempts reached. Error ${e.message} attempting to ban ${username}`, message, e)
            } else {
              const randDelay = randomIntFromRange(0, 1500)
              console.warn(`autoBanSenderOfMessage: ${e.message} attempting to ban ${username}, retrying in ${randDelay} ms...`, e)
              setTimeout(() => {
                sbp('gi.actions/group/autobanUser', message, error, attempt + 1)
              }, randDelay)
            }
          }
        }
      }
    } catch (e) {
      console.error(`${e.name} during autoBanSenderOfMessage!`, message, e)
      // we really can't do much at this point since this is an exception
      // inside of the exception handler :-(
    }
  },
  ...encryptedAction('gi.actions/group/notifyExpiringProposals', L('Failed to notify expiring proposals.'), async function (sendMessage, params) {
    const { proposals } = params.data
    await sendMessage({
      ...omit(params, ['options', 'data', 'action', 'hooks']),
      data: proposals.map(p => p.proposalId),
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    const rootState = sbp('state/vuex/state')
    const { generalChatRoomId } = rootState[params.contractID]

    for (const proposal of proposals) {
      await sbp('gi.actions/chatroom/addMessage', {
        ...omit(params, ['options', 'contractID', 'data', 'hooks']),
        contractID: generalChatRoomId,
        data: {
          type: MESSAGE_TYPES.INTERACTIVE,
          proposal: {
            ...proposal,
            variant: PROPOSAL_VARIANTS.EXPIRING
          }
        },
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })
    }
  }),
  'gi.actions/group/displayMincomeChangedPrompt': async function ({ data }: GIActionParams) {
    const { withGroupCurrency } = sbp('state/vuex/getters')
    const promptOptions = data.increased
      ? {
          heading: L('Mincome changed'),
          question: L('Do you make at least {amount} per month?', { amount: withGroupCurrency(data.amount) }),
          yesButton: data.memberType === 'pledging' ? L('No') : L('Yes'),
          noButton: data.memberType === 'pledging' ? L('Yes') : L('No')
        }
      : {
          heading: L('Automatically switched to pledging {zero}', { zero: withGroupCurrency(0) }),
          question: L('You now make more than the mincome. Would you like to increase your pledge?'),
          yesButton: L('Yes'),
          noButton: L('No')
        }

    const yesButtonSelected = await sbp('gi.ui/prompt', promptOptions)
    if (yesButtonSelected) {
      // NOTE: emtting 'REPLACE_MODAL' instead of 'OPEN_MODAL' here because 'Prompt' modal is open at this point (by 'gi.ui/prompt' action above).
      sbp('okTurtles.events/emit', REPLACE_MODAL, 'IncomeDetails')
    }
  },
  'gi.actions/group/checkGroupSizeAndProposeMember': async function () {
    // if current size of the group is >= 150, display a warning prompt first before presenting the user with
    // 'AddMembers' proposal modal.

    const enforceDunbar = true // Context for this hard-coded boolean variable: https://github.com/okTurtles/group-income/pull/1648#discussion_r1230389924
    const { groupMembersCount, currentGroupState } = sbp('state/vuex/getters')
    const memberInvitesCount = Object.values(currentGroupState.invites || {}).filter((invite: any) => invite.creator !== INVITE_INITIAL_CREATOR).length
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
            yesButton: L('OK')
          }
        : {
            heading: 'Large group size',
            question: L("Groups over 150 members are at significant risk for fraud, {a_}because it is difficult to verify everyone's identity.{_a} Are you sure that you want to add more members?", translationArgs),
            yesButton: L('Yes'),
            noButton: L('Cancel')
          }

      const yesButtonSelected = await sbp('gi.ui/prompt', promptConfig)
      if (!enforceDunbar && yesButtonSelected) {
        sbp('okTurtles.events/emit', REPLACE_MODAL, 'AddMembers')
      } else return false
    } else {
      sbp('okTurtles.events/emit', OPEN_MODAL, 'AddMembers')
    }
  },
  ...encryptedAction('gi.actions/group/leaveChatRoom', L('Failed to leave chat channel.')),
  ...encryptedAction('gi.actions/group/deleteChatRoom', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/group/invite', L('Failed to create invite.')),
  ...encryptedAction('gi.actions/group/inviteAccept', L('Failed to accept invite.')),
  ...encryptedAction('gi.actions/group/inviteRevoke', L('Failed to revoke invite.'), async function (sendMessage, params, signingKeyId) {
    await sbp('chelonia/out/keyDel', {
      contractID: params.contractID,
      contractName: 'gi.contracts/group',
      data: [params.data.inviteKeyId],
      signingKeyId
    })

    return sendMessage(params)
  }),
  ...encryptedAction('gi.actions/group/payment', L('Failed to create payment.')),
  ...encryptedAction('gi.actions/group/paymentUpdate', L('Failed to update payment.')),
  ...encryptedAction('gi.actions/group/sendPaymentThankYou', L('Failed to send a payment thank you note.')),
  ...encryptedAction('gi.actions/group/groupProfileUpdate', L('Failed to update group profile.')),
  ...encryptedAction('gi.actions/group/proposal', L('Failed to create proposal.')),
  ...encryptedAction('gi.actions/group/proposalVote', L('Failed to vote on proposal.')),
  ...encryptedAction('gi.actions/group/proposalCancel', L('Failed to cancel proposal.')),
  ...encryptedAction('gi.actions/group/updateSettings', L('Failed to update group settings.')),
  ...encryptedAction('gi.actions/group/updateAllVotingRules', (params, e) => L('Failed to update voting rules. {codeError}', { codeError: e.message })),
  ...encryptedAction('gi.actions/group/updateLastLoggedIn', L('Failed to update "lastLoggedIn" in a group profile.')),
  ...encryptedAction('gi.actions/group/markProposalsExpired', L('Failed to mark proposals expired.')),
  ...encryptedAction('gi.actions/group/updateDistributionDate', L('Failed to update group distribution date.')),
  ...((process.env.NODE_ENV === 'development' || process.env.CI) && {
    ...encryptedAction('gi.actions/group/forceDistributionDate', L('Failed to force distribution date.'))
  })
}): string[])
