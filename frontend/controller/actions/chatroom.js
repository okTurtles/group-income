'use strict'
import sbp from '@sbp/sbp'

import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, deserializeKey, keyId, keygen, serializeKey } from '@chelonia/crypto'
import { GIErrorUIRuntimeError, L } from '@common/common.js'
import { CHELONIA_KV_STATUS_CHANGED, EVENT_HANDLED } from '@chelonia/lib/events'
import { CHATROOM_TYPES, MESSAGE_RECEIVE_RAW, MESSAGE_TYPES, PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { LOGOUT } from '~/frontend/utils/events.js'
import { KV_KEYS, KV_LOAD_STATUS } from '~/frontend/utils/constants.js'
import { debounce, has, omit } from 'turtledash'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { Secret } from '@chelonia/lib/Secret'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '@chelonia/lib/encryptedData'
import type { GIRegParams } from './types.js'
import { encryptedAction, encryptedNotification } from './utils.js'
import { makeMentionFromUserID } from '@model/chatroom/utils.js'
import { currentKeysHeight, formerMemberKeyIdsToRemove, formerMembersWithCurrentKeys, isOurPrivateGroupChatRoom, ourPrivateGroupChatRoomMembersToRemove, privateGroupChatRoomsToCheck } from '@model/chatroom/privateRoomSecurity.js'
import messageReceivePostEffect from '@model/notifications/messageReceivePostEffect.js'
import { CHATROOM_PRIVACY_LEVEL } from '../../model/contracts/shared/constants.js'

const messageReceivedRawQueue = []

// Tracks whether the identity `unreadMessages` slot has reached a terminal
// load status this session. `chelonia/kv/status` returns `NON_INIT` both when
// the slot's load is still pending (not yet activated / queued behind contract
// sync) AND when a settled load found no server value (404 → default). Only the
// latter is safe to process against; the former must be queued or we compute
// `ourUnreadMessages` against a stale default. This flag disambiguates the two:
// it flips to `true` once the slot reaches any terminal status (`LOADED` /
// `ERROR` / settled `NON_INIT`) and is reset on logout so the next session
// re-gates from scratch.
let unreadMessagesLoadSettled = false

// Function debounced because it might get called too often (on every chatroom
// key update)
const findAndRequestMissingChatroomKeysSet = new Set()
const findAndRequestMissingChatroomKeys = debounce(() => {
  const inner = (contractID) => {
    const state = sbp('chelonia/contract/state', contractID)
    if (!state || !state.members || state.attributes?.privacyLevel !== CHATROOM_PRIVACY_LEVEL.PRIVATE) return

    const CEKid = sbp('chelonia/contract/currentKeyIdByName', state, 'cek', true)
    const CSKid = sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)
    const groupCSKid = sbp('chelonia/contract/currentKeyIdByName', state, 'group-csk', true)

    // If we have all keys, we don't have anything to request
    if (CEKid && CSKid) return

    const cheloniaState = sbp('chelonia/rootState')
    const identityContractID = cheloniaState.loggedIn?.identityContractID

    // Only members can request keys (see `_responseOptionsForKeyRequest`), and
    // former members are expected to be missing them
    if (!state.members[identityContractID] || state.members[identityContractID].hasLeft) return

    if (!groupCSKid) {
      console.error(`[gi.actions/chatroom/findAndRequestMissingChatroomKeys] Missing CSK and CEK, but group CSK is missing in ${contractID}`)
      return
    }

    const contractState = cheloniaState[identityContractID]

    // $FlowFixMe[incompatible-use]
    const groupID = Object.entries(contractState?.groups || {}).find(([groupID, { hasLeft }]) => {
      const groupState = cheloniaState[groupID]
      const chatroom = groupState?.chatRooms?.[contractID]
      return (
        !hasLeft &&
        groupState?.profiles?.[identityContractID]?.status === PROFILE_STATUS.ACTIVE &&
        chatroom &&
        !chatroom.deletedDate &&
        chatroom.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE
      )
    })?.[0]

    if (!groupID) {
      return
    }

    const reference = cheloniaState[identityContractID].groups[groupID].hash + '/' + contractID

    // TODO: Missing '/disconnect' logic for chatrooms
    // See <https://github.com/okTurtles/group-income/issues/3043>
    sbp('chelonia/out/keyRequest', {
      originatingContractID: identityContractID,
      originatingContractName: 'gi.contracts/identity',
      contractID,
      contractName: 'gi.contracts/chatroom',
      reference,
      signingKeyId: groupCSKid,
      innerSigningKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'csk'),
      encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', identityContractID, 'cek'),
      request: 'missing',
      skipInviteAccounting: true,
      innerEncryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', state, 'cek'),
      encryptKeyRequestMetadata: true
    }).catch((e) => {
      console.error(`[gi.actions/chatroom/findAndRequestMissingChatroomKeys] Failed for ${contractID}`, e)
    })
  }

  for (const contractID of findAndRequestMissingChatroomKeysSet) {
    findAndRequestMissingChatroomKeysSet.delete(contractID)
    // Queue to ensure it runs after a contract sync that's in progress
    sbp('chelonia/queueInvocation', contractID, () => inner(contractID))
  }
}, 200)

// The key that 'gi.actions/chatroom/leave' signs with in a group chatroom: the
// chatroom's `group-csk` if we have it, and otherwise its CSK. Using the
// `group-csk` lets group members manage chatroom membership even when they
// aren't chatroom members themselves.
const groupChatRoomLeaveSigningKeyId = (contractIDOrState: string | Object): ?string => {
  return sbp('chelonia/contract/currentKeyIdByName', contractIDOrState, 'group-csk', true) ||
    sbp('chelonia/contract/currentKeyIdByName', contractIDOrState, 'csk', true)
}

// Membership of private group chatrooms is managed through the group, and
// former members must not keep access to a chatroom. For a single chatroom,
// this removes members that the chatroom lists but the group doesn't (for
// example, a former member who re-joined the chatroom directly, using keys that
// hadn't been rotated yet) and, if `rotate` is set and there's nobody to
// remove, rotates the chatroom keys if a former member still holds them.
const enforceChatRoomMembership = async (identityContractID: string, groupID: string, chatRoomID: string, rotate: boolean) => {
  const isApplicable = () => {
    const rootState = sbp('chelonia/rootState')
    return rootState.loggedIn?.identityContractID === identityContractID &&
      isOurPrivateGroupChatRoom(rootState, identityContractID, groupID, chatRoomID)
  }
  const membersToRemove = () => {
    const rootState = sbp('chelonia/rootState')
    if (rootState.loggedIn?.identityContractID !== identityContractID) return []
    return ourPrivateGroupChatRoomMembersToRemove(rootState, identityContractID, groupID, chatRoomID)
  }

  // Act on the latest state, after any events being processed (e.g., by a
  // sync) have been processed
  await sbp('chelonia/contract/wait', [groupID, chatRoomID])
  if (membersToRemove().length) {
    // Without a key to sign the removal with, there's nothing we can do (and
    // no point in syncing the group). Another member can do it, or we can
    // once we receive the key.
    if (!groupChatRoomLeaveSigningKeyId(chatRoomID)) return
    // Membership is decided by the group, so we make sure that our view of the
    // group is up to date before removing anyone
    await sbp('chelonia/contract/retain', groupID, { ephemeral: true })
    try {
      await sbp('chelonia/contract/sync', groupID)
    } finally {
      await sbp('chelonia/contract/release', groupID, { ephemeral: true })
    }
    await sbp('chelonia/contract/wait', [groupID, chatRoomID])
  }

  const toRemove = membersToRemove()
  if (toRemove.length) {
    const signingKeyId = groupChatRoomLeaveSigningKeyId(chatRoomID)
    if (!signingKeyId) return
    // Members are removed without an inner signature and signed with the
    // chatroom's `group-csk` (or its CSK), which is also what's done when a
    // member leaves the group. Their key is removed in the same message, and
    // processing the leave action rotates the chatroom keys.
    await Promise.all(toRemove.map((memberID) => {
      console.warn('[enforceChatRoomMembership] Removing a chatroom member that the group does not list as a member', { groupID, chatRoomID, memberID })
      return sbp('gi.actions/chatroom/leave', {
        contractID: chatRoomID,
        data: { memberID },
        signingKeyId,
        innerSigningContractID: null,
        hooks: {
          preSendCheck: () => {
            return ourPrivateGroupChatRoomMembersToRemove(sbp('chelonia/rootState'), identityContractID, groupID, chatRoomID).includes(memberID)
          }
        }
      }).catch((e) => {
        // Another member removed them first
        if (e?.cause?.name === 'GIChatroomNotMemberError') return
        console.error('[enforceChatRoomMembership] Error removing chatroom member', { groupID, chatRoomID, memberID }, e)
      })
    }))
    return
  }

  if (!rotate || !isApplicable()) return
  const state = sbp('chelonia/contract/state', chatRoomID)
  const CEKid = sbp('chelonia/contract/currentKeyIdByName', state, 'cek')
  const CSKid = sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)
  if (!CEKid || !CSKid) return
  const height = currentKeysHeight(state, CEKid, CSKid)
  if (!formerMembersWithCurrentKeys(state, height).length) return
  // Former members' keys that were never removed would make them count as
  // holding the current keys even after rotating, so they're removed first.
  // Because both operations go through the same publishing queue, the
  // removal always happens before the rotation.
  const staleKeyIds = formerMemberKeyIdsToRemove(state)
  if (staleKeyIds.length) {
    console.warn('[enforceChatRoomMembership] Removing keys of former chatroom members', { groupID, chatRoomID, staleKeyIds })
    await sbp('chelonia/out/keyDel', {
      contractID: chatRoomID,
      contractName: 'gi.contracts/chatroom',
      data: staleKeyIds,
      signingKeyId: CSKid,
      hooks: {
        preSendCheck: (_, state) => formerMemberKeyIdsToRemove(state).some((keyId) => staleKeyIds.includes(keyId))
      }
    }).catch((e) => {
      console.error('[enforceChatRoomMembership] Error removing keys of former chatroom members', { groupID, chatRoomID }, e)
    })
  }
  // This is also the case for a short while after a member leaves, until the
  // rotation triggered by processing the leave action is done. Rotating here
  // as well is harmless, as only one rotation of the same keys gets sent.
  console.info('[enforceChatRoomMembership] Rotating chatroom keys: former members still hold the current keys', { groupID, chatRoomID })
  await sbp('chelonia/contract/setPendingKeyRevocation', chatRoomID, ['cek', 'csk'], [CEKid, CSKid])
  await sbp('gi.actions/out/rotateKeys', chatRoomID, 'gi.contracts/chatroom', 'pending', 'gi.actions/chatroom/shareNewKeys')
}

// Runs `enforceChatRoomMembership` at most once at a time per account and
// chatroom. Requests made while it's running result in it being run again
// afterwards, so that changes that happened in the meantime aren't missed.
const membershipEnforcementRuns: Map<string, { again: boolean, rotate: boolean }> = new Map()
const runEnforceChatRoomMembership = async (identityContractID: string, groupID: string, chatRoomID: string, rotate: boolean) => {
  const runKey = `${identityContractID}|${chatRoomID}`
  const running = membershipEnforcementRuns.get(runKey)
  if (running) {
    running.again = true
    running.rotate = running.rotate || rotate
    return
  }
  const run = { again: true, rotate }
  membershipEnforcementRuns.set(runKey, run)
  try {
    while (run.again) {
      const rotateNow = run.rotate
      run.again = false
      run.rotate = false
      try {
        await enforceChatRoomMembership(identityContractID, groupID, chatRoomID, rotateNow)
      } catch (e) {
        console.error('[enforceChatRoomMembership] Error', { groupID, chatRoomID }, e)
      }
    }
  } finally {
    membershipEnforcementRuns.delete(runKey)
  }
}

// Besides the migration in `state/vuex/postUpgradeVerification` (which covers
// existing state and newly synced contracts), private group chatrooms are
// checked when their events are processed. This way, members who join a
// private chatroom without going through the group are removed right away,
// rather than on the next login. The check here is cheap; the delay lets
// in-progress operations (like a member leaving) finish first.
// A check that didn't remove anyone (for example, because publishing failed)
// isn't repeated for the same members for `MEMBERSHIP_RECHECK_MS`, so that it
// isn't retried (and logged) on every chatroom event. That record is cleared by
// the first event that shows nobody to remove, even while a check is pending,
// so that a member who re-joins later is checked again. Checks are also skipped
// while we don't have a key to sign removals with; the first event after the
// key arrives triggers one.
const MEMBERSHIP_RECHECK_MS = 5 * 60_000
const membershipCheckTimers: Map<string, TimeoutID> = new Map()
// chatRoomID -> the members that were last checked for removal, and when
const lastMembershipChecks: Map<string, { members: string, at: number }> = new Map()
sbp('okTurtles.events/on', EVENT_HANDLED, (contractID: string) => {
  const rootState = sbp('chelonia/rootState')
  if (rootState.contracts?.[contractID]?.type !== 'gi.contracts/chatroom') return
  const identityContractID = rootState.loggedIn?.identityContractID
  if (!identityContractID) return
  const groupID = Object.keys(rootState[identityContractID]?.groups || {})
    .find((groupID) => !!rootState[groupID]?.chatRooms?.[contractID])
  if (!groupID) return
  const toRemove = ourPrivateGroupChatRoomMembersToRemove(rootState, identityContractID, groupID, contractID)
  if (!toRemove.length) {
    lastMembershipChecks.delete(contractID)
    return
  }
  // A check is already scheduled; it will use the state at the time it runs
  if (membershipCheckTimers.has(contractID)) return
  if (!groupChatRoomLeaveSigningKeyId(rootState[contractID])) return
  const members = [...toRemove].sort().join(',')
  const lastCheck = lastMembershipChecks.get(contractID)
  if (lastCheck && lastCheck.members === members && Date.now() - lastCheck.at < MEMBERSHIP_RECHECK_MS) return
  lastMembershipChecks.set(contractID, { members, at: Date.now() })
  membershipCheckTimers.set(contractID, setTimeout(() => {
    membershipCheckTimers.delete(contractID)
    runEnforceChatRoomMembership(identityContractID, groupID, contractID, false)
  }, 1000))
})

function messageReceivedRawHandler ({ contractID, data, innerSigningContractID, newMessage }) {
  const rootState = sbp('chelonia/rootState')
  const getters = sbp('state/vuex/getters')
  const state = sbp('chelonia/contract/state', contractID)
  const mentions = makeMentionFromUserID(rootState.loggedIn?.identityContractID)
  const msgData = newMessage || data
  const isMentionedMe = (!!newMessage || data.type === MESSAGE_TYPES.TEXT) && msgData.text &&
  (msgData.text.includes(mentions.me) || msgData.text.includes(mentions.all))

  if (!newMessage) {
    const isAlreadyAdded = !!getters
      .chatRoomUnreadMessages(contractID).find(m => m.messageHash === data.hash)

    if (isAlreadyAdded && !isMentionedMe) {
      sbp('gi.actions/identity/kv/removeChatRoomUnreadMessage', { contractID, messageHash: data.hash }).catch(e => {
        console.error('[MESSAGE_RECEIVE_RAW handler] Error calling removeChatRoomUnreadMessage', e)
      })
    }
    if (isAlreadyAdded) return
  }

  const userReadUntil = getters.ourUnreadMessages[contractID]?.readUntil
  if (userReadUntil?.createdHeight >= msgData.height) {
    // If user has already read this message (eg. From other devices of the user), do not send a notification.
    return
  }

  messageReceivePostEffect({
    contractID,
    messageHash: msgData.hash,
    height: msgData.height,
    text: msgData.text,
    isDMOrMention: isMentionedMe || state.attributes?.type === CHATROOM_TYPES.DIRECT_MESSAGE,
    messageType: !newMessage ? MESSAGE_TYPES.TEXT : data.type,
    memberID: innerSigningContractID,
    chatRoomName: state.attributes?.name
  }).catch(e => {
    console.error('[action/chatroom.js] Error on messageReceivePostEffect', e)
  })
}

sbp('okTurtles.events/on', MESSAGE_RECEIVE_RAW, ({
  contractID,
  data,
  innerSigningContractID,
  // If newMessage is undefined, it means that an existing message is being edited
  newMessage
}) => {
  const rootState = sbp('chelonia/rootState')
  const eventParams = { contractID, data, innerSigningContractID, newMessage }

  const identityContractID = rootState.loggedIn?.identityContractID
  // Queue while the identity `unreadMessages` slot load is still pending. Once
  // it settles (terminal status, tracked by `unreadMessagesLoadSettled`) the
  // mirror is authoritative and messages can be processed directly. Without a
  // logged-in identity there is no slot to wait on, so process immediately.
  if (identityContractID && !unreadMessagesLoadSettled) {
    // Without the identity-kv store loaded, logic in messageReceivedRawHandler()
    // would use the wrong getters.chatRoomUnreadMessages and
    // getters.ourUnreadMessages, leading to wrong computations and thus wrong
    // behaviour. (eg. 'message-received' sound for a DM plays even when the user
    // has already read it from another device.) So we queue the events here and
    // process them once the slot reaches a terminal load status.
    // On `ERROR` we stop queueing and process events anyway: the slot will not
    // reach `'loaded'`, so blocking forever would silently drop all incoming
    // chat messages for the rest of the session.
    messageReceivedRawQueue.push(eventParams)
  } else {
    if (messageReceivedRawQueue.length) {
      // If the queue is still being processed, the event should be added to the queue to ensure
      // it is processed in the correct order
      messageReceivedRawQueue.push(eventParams)
    } else {
      messageReceivedRawHandler(eventParams)
    }
  }
})

sbp('okTurtles.events/on', CHELONIA_KV_STATUS_CHANGED, ({ contractType, key, status }) => {
  if (
    contractType === 'gi.contracts/identity' &&
    key === KV_KEYS.UNREAD_MESSAGES &&
    // A terminal status means the mirror is now authoritative. Flush on `ERROR`
    // as well as `LOADED`: the slot will not reach `'loaded'` after a load
    // failure, so keeping the queue would block all incoming chat messages for
    // the rest of the session. `NON_INIT` here is the settled "no server value"
    // case (404 → default), which is equally safe to process against.
    (status === KV_LOAD_STATUS.LOADED || status === KV_LOAD_STATUS.ERROR || status === KV_LOAD_STATUS.NON_INIT)
  ) {
    unreadMessagesLoadSettled = true
    while (messageReceivedRawQueue.length > 0) {
      messageReceivedRawHandler(messageReceivedRawQueue.shift())
    }
  }
})

// Re-gate on logout so a subsequent login waits for its own slot load before
// processing chat messages, rather than reusing the previous session's flag.
sbp('okTurtles.events/on', LOGOUT, () => {
  unreadMessagesLoadSettled = false
  membershipCheckTimers.forEach((timer) => clearTimeout(timer))
  membershipCheckTimers.clear()
  lastMembershipChecks.clear()
})

export default (sbp('sbp/selectors/register', {
  'gi.actions/chatroom/create': async function (params: GIRegParams, billableContractID: string) {
    const rootState = sbp('state/vuex/state')
    const userID = rootState.loggedIn.identityContractID
    await sbp('chelonia/contract/retain', userID, { ephemeral: true })
    try {
      let cskOpts = params.options?.csk
      let cekOpts = params.options?.cek

      if (!cekOpts) {
        const CEK = keygen(CURVE25519XSALSA20POLY1305)
        const CEKid = keyId(CEK)
        const CEKp = serializeKey(CEK, false)
        const CEKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CEK, true))

        cekOpts = {
          id: CEKid,
          foreignKey: undefined,
          meta: {
            private: {
              content: CEKs,
              shareable: true
            }
          },
          data: CEKp,
          _rawKey: CEK
        }
      }

      const CEK = cekOpts._rawKey ? cekOpts._rawKey : deserializeKey(cekOpts.data)

      if (!cskOpts) {
        const CSK = keygen(EDWARDS25519SHA512BATCH)
        const CSKid = keyId(CSK)
        const CSKp = serializeKey(CSK, false)
        const CSKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CSK, true))

        cskOpts = {
          id: CSKid,
          foreignKey: undefined,
          meta: {
            private: {
              content: CSKs,
              shareable: true
            }
          },
          data: CSKp,
          _rawKey: CSK
        }
      }

      // Before creating the contract, put all keys into transient store
      await sbp('chelonia/storeSecretKeys',
        // $FlowFixMe[incompatible-use]
        new Secret([cekOpts._rawKey, cskOpts._rawKey].map(key => ({ key, transient: true })))
      )

      const userCSKid = await sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')
      if (!userCSKid) throw new Error('User CSK id not found')

      const SAK = keygen(EDWARDS25519SHA512BATCH)
      const SAKid = keyId(SAK)
      const SAKp = serializeKey(SAK, false)
      const SAKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(SAK, true))

      const chatroom = await sbp('chelonia/out/registerContract', {
        ...omit(params, ['options']), // any 'options' are for this action, not for Chelonia
        publishOptions: {
          billableContractID,
          ...params.publishOptions
        },
        signingKeyId: cskOpts.id,
        actionSigningKeyId: cskOpts.id,
        actionEncryptionKeyId: cekOpts.id,
        keys: [
          {
            id: cskOpts.id,
            name: 'csk',
            purpose: ['sig'],
            ringLevel: 0,
            permissions: '*',
            allowedActions: '*',
            foreignKey: cskOpts.foreignKey,
            meta: cskOpts.meta,
            data: cskOpts.data
          },
          {
            id: cekOpts.id,
            name: 'cek',
            purpose: ['enc'],
            ringLevel: 0,
            permissions: [SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST_SEEN, SPMessage.OP_KEY_SHARE],
            allowedActions: '*',
            foreignKey: cekOpts.foreignKey,
            meta: cekOpts.meta,
            data: cekOpts.data
          },
          ...(params.options?.groupKeys
            ? [
                {
                  id: params.options.groupKeys[0].id,
                  name: 'group-csk',
                  purpose: ['sig'],
                  ringLevel: 2,
                  permissions: [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST],
                  allowedActions: ['gi.contracts/chatroom/leave'],
                  foreignKey: params.options.groupKeys[0].foreignKey,
                  meta: params.options.groupKeys[0].meta,
                  data: params.options.groupKeys[0].data
                },
                {
                  id: params.options.groupKeys[1].id,
                  name: 'group-cek',
                  purpose: ['enc'],
                  ringLevel: 2,
                  permissions: [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_ADD, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED],
                  allowedActions: ['gi.contracts/chatroom/join', 'gi.contracts/chatroom/leave'],
                  foreignKey: params.options.groupKeys[1].foreignKey,
                  meta: params.options.groupKeys[1].meta,
                  data: params.options.groupKeys[1].data
                }
              ]
            : []),
          {
            id: SAKid,
            name: '#sak',
            purpose: ['sak'],
            ringLevel: 0,
            permissions: [],
            allowedActions: [],
            meta: {
              private: {
                content: SAKs
              }
            },
            data: SAKp
          }
        ],
        data: {
          ...params.data,
          attributes: {
            ...params.data?.attributes,
            creatorID: userID
          }
        },
        contractName: 'gi.contracts/chatroom'
      })

      // After the contract has been created, store pesistent keys
      await sbp('chelonia/storeSecretKeys',
        // $FlowFixMe[incompatible-use]
        new Secret([cekOpts._rawKey, cskOpts._rawKey].map(key => ({ key })))
      )

      return chatroom
    } catch (e) {
      console.error('gi.actions/chatroom/register failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create chat channel.'))
    } finally {
      await sbp('chelonia/contract/release', userID, { ephemeral: true })
    }
  },
  // Helper function to select new keys to share with members after a key rotation
  // `newKeys` contains the new keys (after rotation)
  // Called by 'gi.actions/out/rotateKeys'
  // `options` indicates whether this is the last attempt at this operation or not
  // (on our part). The goal is not to block key rotations (which would happen if
  // this method throws), while at the same time ensuring that we don't exclude any
  // member from the key share.
  // If it's _not_ the last attempt, we throw if we are unable to share keys with
  // an existing member. The operation will be re-attempted later.
  // If it _is_ the last attempt, we proceed with key rotation, even though we
  // may exclude some members. Those members can notice and send an `OP_KEY_REQUEST`
  // later (but will be temporarily unable to participate).
  'gi.actions/chatroom/shareNewKeys': async (contractID: string, newKeys: Object, options: { lastAttempt?: boolean } = {}) => {
    const state = sbp('chelonia/contract/state', contractID)
    const mainCEKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'cek')

    // NOTE: The following code _prevents_ key rotations when no-one has left
    // The purpose of this is twofold:
    //   - Testing PR 3058 (issue 2988) resulted in an infinite loop during test
    //     conditions. It is unlikely that such an infinite loop would happen
    //     under real conditions, but unnecessary and unexpected re-syncs could
    //     occur.
    //   - PR 3057 introduced improvements for more deterministic and efficient
    //     key rotations. The changes aim at preventing unnecessary key
    //     rotations, which could previously occur when re-syncing a contract,
    //     even if no-one had left a group or chatroom. However, those
    //     improvements were done in the contracts themselves, meaning that old
    //     contracts will continue to show the old behaviour. This check refuses
    //     those key rotations even if an old contract version is used.
    // eslint-disable-next-line no-lone-blocks
    {
      // Check that it's the CEK that we're rotating
      if (state._volatile?.pendingKeyRevocations?.[mainCEKid]) {
        // Check that it's also the CSK that we're rotating
        const mainCSKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)
        if (mainCSKid && state._volatile.pendingKeyRevocations[mainCSKid]) {
          // Pick the height for the earliest rotation of the CEK or the CSK
          // For example, if the CEK was rotated last at height = 12 and
          // the CSK was rotated last at height = 15, we allow a rotations to
          // proceed if someone left at at time >= 12. This is for robustness,
          // as the CEK and the CSK are rotated together.
          const height = currentKeysHeight(state, mainCEKid, mainCSKid)
          // Chatroom contracts don't have `departedHeight` nor a similar attribute,
          // meaning that we have to rely on key operations: a rotation is
          // needed if a former member's key is still current, i.e., it hasn't
          // been removed yet or it was removed after the last rotation. Keys
          // that haven't been removed yet must be counted, because when a
          // member leaves, other members process the leave action (and attempt
          // this rotation) before anyone has removed their key.
          const hasAnyoneLeftAfterLastRotation = formerMembersWithCurrentKeys(state, height).length > 0
          if (!hasAnyoneLeftAfterLastRotation) {
            delete state._volatile.pendingKeyRevocations[mainCEKid]
            delete state._volatile.pendingKeyRevocations[mainCSKid]
            console.warn('NOTE: Refusing unnecessary chatroom key rotation because no-one has left', contractID, height)
            throw new Error('[chatroom] Refusing key rotation because no-one has left')
          }
        }
      }
    }

    const activeMemberIds = sbp('state/vuex/getters').chatRoomActiveMemberIdsForChatRoom(state)
    return Promise.all(activeMemberIds.map(async (pContractID) => {
      const retained = await sbp('chelonia/contract/retain', pContractID, { ephemeral: true }).then(() => [true], (e) => [false, e])
      if (!retained[0]) {
        const e = retained[1]
        if (e?.name === 'ChelErrorResourceGone') {
          console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: ${pContractID} does not exist`, e)
        } else {
          console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: Error retaining ${pContractID}`, e)
        }
        if (options.lastAttempt) {
          return
        } else {
          throw new Error('Unable to share rotated keys')
        }
      }
      try {
        const CEKid = await sbp('chelonia/contract/currentKeyIdByName', pContractID, 'cek')
        if (!CEKid) {
          console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: Missing CEK`)
          if (options.lastAttempt) {
            return
          } else {
            throw new Error('Unable to share rotated keys')
          }
        }
        return [
          'chelonia/out/keyShare',
          {
            data: encryptedOutgoingData(contractID, mainCEKid, {
              contractID,
              foreignContractID: pContractID,
              // $FlowFixMe
              keys: Object.values(newKeys).map(([, newKey, newId]: [any, Key, string]) => ({
                id: newId,
                meta: {
                  private: {
                    content: encryptedOutgoingData(pContractID, CEKid, serializeKey(newKey, true))
                  }
                }
              }))
            })
          }
        ]
      } catch (e) {
        // This must be done to prevent a single failure on a single contract
        // from blocking a key rotation.
        if (options.lastAttempt) {
          return
        } else {
          throw e
        }
      } finally {
        await sbp('chelonia/contract/release', pContractID, { ephemeral: true })
      }
    })).then((keys) => [keys.filter(Boolean)])
  },
  'gi.actions/chatroom/_ondeleted': async (contractID: string, state: Object) => {
    const rootGetters = sbp('state/vuex/getters')
    const identityState = rootGetters.currentIdentityState
    if (identityState.chatRooms?.[contractID]) {
      const identityContractID = rootGetters.ourIdentityContractId

      await sbp('gi.actions/identity/deleteDirectMessage', { contractID: identityContractID, data: { contractID } }).catch(e => {
        console.warn(`[handleDeletedContract] ${e.name} thrown by gi.actions/identity/deleteDirectMessage ${identityContractID} for ${contractID}:`, e)
      })
    } else {
      // This is a group chatroom. To determine which group the chatroom
      // belongs to, we need to go over each group, since there isn't a
      // chatroom->group relationship stored.
      const cIDs = Object.entries(identityState.groups || {}).filter(([cID, state]) => {
        return !((state: any): Object).hasLeft
      }).map(([cID]) => {
        return cID
      })

      for (const cID of cIDs) {
        const groupState = sbp('chelonia/contract/state', cID)
        // If the chatroom isn't part of this group, continue
        if (!groupState?.chatRooms?.[contractID]) continue

        if (!groupState.chatRooms[contractID].deletedDate) {
          // If the chatroom hasn't been 'deleted' in the group, attempt to do
          // so now.
          await sbp('gi.actions/group/deleteChatRoom', {
            contractID: cID,
            data: { chatRoomID: contractID }
          }).catch(e => {
            console.warn(`[handleDeletedContract] ${e.name} thrown by gi.actions/group/deleteChatRoom ${cID} for ${contractID}:`, e)
          })
        }

        // No need to continue in the loop, as chatrooms belong to a single
        // group
        break
      }
    }
  },
  // Action to request missing keys after a rotation
  // Called from the contract on OP_KEY_UPDATE
  'gi.actions/chatroom/findAndRequestMissingChatroomKeys': (contractID) => {
    findAndRequestMissingChatroomKeysSet.add(contractID)
    findAndRequestMissingChatroomKeys()
  },
  // Migration action to update group CSK permissions to include OP_KEY_REQUEST
  // Called from postUpgradeVerification
  'gi.actions/chatroom/upgradeGroupCskPermissions': (chatRoomIds) => {
    chatRoomIds.forEach((chatRoomID) => {
      const state = sbp('chelonia/contract/state', chatRoomID)
      if (!state) return

      const groupCSKid = sbp('chelonia/contract/currentKeyIdByName', state, 'group-csk')
      // Return if we've already upgraded this chatroom
      if (!groupCSKid || state._vm.authorizedKeys[groupCSKid].permissions.includes(SPMessage.OP_KEY_REQUEST)) return

      const CSKid = sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)

      if (!CSKid) return

      sbp('chelonia/out/keyUpdate', {
        contractID: chatRoomID,
        contractName: 'gi.contracts/chatroom',
        data: [
          {
            name: 'group-csk',
            oldKeyId: groupCSKid,
            permissions: [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST]
          }
        ],
        signingKeyId: CSKid
      }).catch(e => {
        console.error(`[gi.actions/chatroom/upgradeGroupCskPermissions] Error updating group CSK for ${chatRoomID}`, e)
      })
    })
  },
  // Migration action to update CEK permissions to include OP_KEY_SHARE and OP_KEY_REQUEST_SEEN
  // Called from postUpgradeVerification
  'gi.actions/chatroom/upgradeCekPermissions': (chatRoomIds) => {
    chatRoomIds.forEach((chatRoomID) => {
      const state = sbp('chelonia/contract/state', chatRoomID)
      if (!state) return

      const CEKid = sbp('chelonia/contract/currentKeyIdByName', state, 'cek')
      // Return if we've already upgraded this chatroom
      if (!CEKid || (
        state._vm.authorizedKeys[CEKid].permissions.includes(SPMessage.OP_KEY_SHARE) &&
        state._vm.authorizedKeys[CEKid].permissions.includes(SPMessage.OP_KEY_REQUEST_SEEN)
      )) return

      const CSKid = sbp('chelonia/contract/currentKeyIdByName', state, 'csk', true)

      if (!CSKid) return

      sbp('chelonia/out/keyUpdate', {
        contractID: chatRoomID,
        contractName: 'gi.contracts/chatroom',
        data: [
          {
            name: 'cek',
            oldKeyId: CEKid,
            permissions: [SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST_SEEN, SPMessage.OP_KEY_SHARE]
          }
        ],
        signingKeyId: CSKid
      }).catch(e => {
        console.error(`[gi.actions/chatroom/upgradeCekPermissions] Error updating group CEK for ${chatRoomID}`, e)
      })
    })
  },
  // Migration action to secure private group chatrooms (DMs are not affected)
  // Called from postUpgradeVerification, for existing contracts and for
  // contracts synced later on.
  // Removes members that a chatroom lists but its group doesn't (e.g., former
  // members who re-joined the chatroom directly, using keys that hadn't been
  // rotated), and rotates the chatroom keys if former members still hold them.
  // `contractIDHints`, if given, limits this to the chatrooms listed and to
  // the chatrooms of the groups listed.
  'gi.actions/chatroom/revokeFormerMemberAccess': async (contractIDHints?: ?string[]) => {
    const rootState = sbp('chelonia/rootState')
    const identityContractID = rootState.loggedIn?.identityContractID
    if (!identityContractID) return

    const chatRooms = privateGroupChatRoomsToCheck(rootState, identityContractID)
      .filter(({ groupID, chatRoomID }) => (
        !Array.isArray(contractIDHints) ||
        contractIDHints.includes(groupID) ||
        contractIDHints.includes(chatRoomID)
      ))

    await Promise.all(chatRooms.map(({ groupID, chatRoomID }) => {
      return runEnforceChatRoomMembership(identityContractID, groupID, chatRoomID, true)
    }))
  },
  ...encryptedNotification('gi.actions/chatroom/user-typing-event', L('Failed to send typing notification')),
  ...encryptedNotification('gi.actions/chatroom/user-stop-typing-event', L('Failed to send stopped typing notification')),
  ...encryptedAction('gi.actions/chatroom/addMessage', L('Failed to add message.')),
  ...encryptedAction('gi.actions/chatroom/editMessage', L('Failed to edit message.')),
  ...encryptedAction('gi.actions/chatroom/deleteMessage', L('Failed to delete message.')),
  ...encryptedAction('gi.actions/chatroom/deleteAttachment', L('Failed to delete attachment of message.')),
  ...encryptedAction('gi.actions/chatroom/makeEmotion', L('Failed to make emotion.')),
  ...encryptedAction('gi.actions/chatroom/pinMessage', L('Failed to pin message.')),
  ...encryptedAction('gi.actions/chatroom/unpinMessage', L('Failed to unpin message.')),
  ...encryptedAction('gi.actions/chatroom/join', L('Failed to join chat channel.'), async (sendMessage, params) => {
    const rootState = sbp('state/vuex/state')
    const identityContractID = rootState.loggedIn.identityContractID
    // We accept an array for memberID to aggregate all joins
    const userIDs = (
      Array.isArray(params.data.memberID) ? params.data.memberID : [params.data.memberID]
    // If the memberID isn't specified, it's ourselves joining. This is
    // consistent with how the contract works and produces shorter messages
    ).map(memberID => memberID == null ? identityContractID : memberID)

    const state = sbp('chelonia/contract/state', params.contractID)
    if (!state?.attributes) {
      throw new Error(`[gi.actions/chatroom/join] Cannot join chatroom ${params.contractID}: contract state not available`)
    }
    const isGroupChatroom = state.attributes.type === CHATROOM_TYPES.GROUP

    if (isGroupChatroom) {
      const groupCEKid = sbp('chelonia/contract/currentKeyIdByName', state, 'group-cek', true)
      if (groupCEKid) {
        // Set encryption key to the CEK; this allows for managing joining and
        // leaving the chatroom transparently to group members
        params.encryptionKeyId = groupCEKid
      }
    }
    if (!params.encryptionKeyId) {
      throw new Error(`[gi.actions/chatroom/join] No encryption key available for chatroom ${params.contractID}`)
    }

    // We need to read values from both the chatroom and the identity contracts'
    // state, so we call wait to run the rest of this function after all
    // operations in those contracts have completed
    await sbp('chelonia/contract/retain', userIDs, { ephemeral: true })
    try {
      await sbp('chelonia/contract/wait', params.contractID)

      userIDs.forEach(cID => {
        if (!cID || !has(rootState.contracts, cID) || !has(rootState, cID)) {
          throw new Error(`Unable to send gi.actions/chatroom/join on ${params.contractID} because user ID contract ${cID} is missing`)
        }
      })

      const userCSKids = await Promise.all(userIDs.map(async (cID) =>
        [cID, await sbp('chelonia/contract/currentKeyIdByName', cID, 'csk')]
      ))
      return await sbp('chelonia/out/atomic', {
        ...params,
        contractName: 'gi.contracts/chatroom',
        data: [
        // Add the user's CSK to the contract
          [
            'chelonia/out/keyAdd', {
            // TODO: Find a way to have this wrapping be done by Chelonia directly
              data: userCSKids.map(([cID, cskID]: [string, string]) => encryptedOutgoingData(params.contractID, params.encryptionKeyId, {
                foreignKey: `shelter:${encodeURIComponent(cID)}?keyName=${encodeURIComponent('csk')}`,
                id: cskID,
                data: rootState[cID]._vm.authorizedKeys[cskID].data,
                permissions: [SPMessage.OP_ACTION_ENCRYPTED + '#inner'],
                allowedActions: '*',
                purpose: ['sig'],
                ringLevel: Number.MAX_SAFE_INTEGER,
                name: `${cID}/${cskID}`
              }))
            }
          ],
          ...userIDs.map(cID => sendMessage({
            ...params,
            data: cID === identityContractID
              ? {}
              : { memberID: cID },
            returnInvocation: true
          }))
        ]
      })
    } finally {
      await sbp('chelonia/contract/release', userIDs, { ephemeral: true })
    }
  }),
  ...encryptedAction('gi.actions/chatroom/accept', L('Failed to accept chat channel.'), async (sendMessage, params) => {
    const identityContractID = sbp('state/vuex/state').loggedIn.identityContractID
    const state = sbp('chelonia/contract/state', params.contractID)
    // Already accepted (e.g., a side effect re-running after a re-sync); sending
    // it again would only fail validation
    if (state?.members?.[identityContractID]?.acceptedHeight != null) return

    return await sendMessage({ ...omit(params, ['options', 'action']) })
  }),
  ...encryptedAction('gi.actions/chatroom/rename', L('Failed to rename chat channel.')),
  ...encryptedAction('gi.actions/chatroom/changeDescription', L('Failed to change chat channel description.')),
  ...encryptedAction('gi.actions/chatroom/leave', L('Failed to leave chat channel.'), async (sendMessage, params) => {
    // When leaving by ourselves, we also remove our own key in the same
    // message. Otherwise, our key would remain valid until someone else removes
    // it. The member whose keys are removed is determined the same way as the
    // contract determines who is leaving: `memberID` if given, and otherwise
    // the inner signer, which is us unless `innerSigningContractID` is set
    // (`null` meaning no inner signature, and so no member).
    const userID = params.data.memberID || (
      params.innerSigningContractID === undefined
        ? sbp('state/vuex/state').loggedIn.identityContractID
        : params.innerSigningContractID
    )
    const keyIds = userID && await sbp('chelonia/contract/foreignKeysByContractID', params.contractID, userID)

    const state = sbp('chelonia/contract/state', params.contractID)
    if (!state?.attributes) {
      throw new Error(`[gi.actions/chatroom/leave] Cannot leave chatroom ${params.contractID}: contract state not available`)
    }
    const isGroupChatroom = state.attributes.type === CHATROOM_TYPES.GROUP

    if (isGroupChatroom) {
      // Set signing key to the `group-csk` (or the CSK); this allows for
      // managing joining and leaving the chatroom transparently to group
      // members
      const signingKeyId = groupChatRoomLeaveSigningKeyId(state)
      if (!signingKeyId) {
        throw new Error('No CSK id for chatroom: ' + params.contractID)
      }
      params.signingKeyId = signingKeyId

      const groupCEKid = sbp('chelonia/contract/currentKeyIdByName', state, 'group-cek', true)
      if (groupCEKid) {
        // Set encryption key to the CEK; this allows for managing joining and
        // leaving the chatroom transparently to group members
        params.encryptionKeyId = groupCEKid
      }
    }

    if (keyIds?.length) {
      return await sbp('chelonia/out/atomic', {
        ...params,
        contractName: 'gi.contracts/chatroom',
        data: [
          sendMessage({ ...params, returnInvocation: true }),
          // Remove the user's CSK from the contract
          [
            'chelonia/out/keyDel', {
              data: keyIds
            }
          ]
        ]
      })
    }

    return await sendMessage(params)
  }),
  ...encryptedAction('gi.actions/chatroom/delete', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/chatroom/voteOnPoll', L('Failed to vote on a poll.')),
  ...encryptedAction('gi.actions/chatroom/changeVoteOnPoll', L('Failed to change vote on a poll.')),
  ...encryptedAction('gi.actions/chatroom/closePoll', L('Failed to close a poll.'))
}): string[])
