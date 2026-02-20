'use strict'

import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import {
  MESSAGE_TYPES,
  POLL_STATUS,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_REMOVE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_GENERIC,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR
} from './constants.js'
import { NEW_CHATROOM_SCROLL_POSITION } from '@utils/events.js'
import { humanDate } from './time.js'

// !!!!!!!!!!!!!!!
// !! IMPORTANT !!
// !!!!!!!!!!!!!!!
//
// DO NOT CHANGE THE LOGIC TO ANY OF THESE FUNCTIONS!
// INSTEAD, CREATE NEW FUNCTIONS WITH DIFFERENT NAMES
// AND USE THOSE INSTEAD!
//
// THIS IS A CONSEQUENCE OF SHARING THIS CODE WITH THE REST OF THE APP.
// IF YOU DO NOT NEED TO SHARE CODE WITH THE REST OF THE APP (AND CAN
// KEEP IT WITHIN THE CONTRACT ONLY), THEN YOU DON'T NEED TO WORRY ABOUT
// THIS, AND SHOULD INCLUDE THOSE FUNCTIONS (WITHOUT EXPORTING THEM),
// DIRECTLY IN YOUR CONTRACT DEFINITION FILE. THEN YOU CAN MODIFY
// THEM AS MUCH AS YOU LIKE (and generate new contract versions out of them).

// group.js related

export function paymentHashesFromPaymentPeriod (periodPayments: Object): string[] {
  let hashes = []
  if (periodPayments) {
    const { paymentsFrom } = periodPayments
    for (const fromMemberID in paymentsFrom) {
      for (const toMemberID in paymentsFrom[fromMemberID]) {
        hashes = hashes.concat(paymentsFrom[fromMemberID][toMemberID])
      }
    }
  }

  return hashes
}

export function createPaymentInfo (paymentHash: string, payment: Object): {
  fromMemberID: string, toMemberID: string, hash: string, amount: number, isLate: boolean, when: string
} {
  return {
    fromMemberID: payment.data.fromMemberID,
    toMemberID: payment.data.toMemberID,
    hash: paymentHash,
    amount: payment.data.amount,
    isLate: !!payment.data.isLate,
    when: payment.data.completedDate
  }
}

export function getProposalDetails (proposal: Object): Object {
  const { creatorID, status } = proposal
  const { proposalType, proposalData } = proposal.data

  const settingsTranslationMap = {
    'mincomeAmount': L('mincome'),
    'distributionDate': L('distribution date'),
    'votingSystem': L('voting system'),
    'votingRule': L('voting rules')
  }
  const options = {}
  if (proposalType === PROPOSAL_PROPOSAL_SETTING_CHANGE) {
    if (proposalData.ruleName !== proposalData.current.ruleName) {
      options['settingType'] = 'votingSystem'
    } else if (proposalData.ruleThreshold !== proposalData.current.ruleThreshold) {
      options['settingType'] = 'votingRule'
    }
  } else if (proposalType === PROPOSAL_GROUP_SETTING_CHANGE) {
    options['settingType'] = proposalData.setting
  } else if (proposalType === PROPOSAL_GENERIC) {
    options['title'] = proposalData.name
  } else if (proposalType === PROPOSAL_INVITE_MEMBER) {
    options['member'] = proposalData.memberName
  } else if (proposalType === PROPOSAL_REMOVE_MEMBER) {
    options['memberID'] = proposalData.memberID
    // options['member'] is not set as it's part of external state. The code
    // responsible for notifications (`frontend/model/notifications/templates.js`)
    // will set it
  }

  const { proposedValue } = proposalData
  if (proposedValue) {
    if (options.settingType === 'distributionDate') {
      options['value'] = humanDate(proposedValue, { month: 'long', year: 'numeric', day: 'numeric' })
    } else {
      options['value'] = proposedValue
    }
  }
  if (options.settingType) {
    options['setting'] = settingsTranslationMap[options.settingType]
  }

  return { creatorID, status, type: proposalType, options }
}

// chatroom.js related

export function createMessage ({ meta, data, hash, height, state, pending, innerSigningContractID }: {
  meta: Object,
  data: Object,
  hash: string,
  height: number,
  state?: Object,
  pending?: boolean,
  innerSigningContractID?: String
}): Object {
  const { type, text, replyingMessage, attachments } = data
  const { createdDate } = meta

  const newMessage: any = {
    type,
    hash,
    height,
    from: innerSigningContractID,
    datetime: new Date(createdDate).toISOString()
  }

  if (pending) {
    newMessage.pending = true
  }

  if (type === MESSAGE_TYPES.TEXT) {
    newMessage.text = text
    if (replyingMessage) {
      newMessage.replyingMessage = replyingMessage
    }
    if (attachments) {
      newMessage.attachments = attachments
    }
  } else if (type === MESSAGE_TYPES.POLL) {
    newMessage.pollData = {
      ...data.pollData,
      creatorID: innerSigningContractID,
      status: POLL_STATUS.ACTIVE,
      // 'voted' field below will contain the user names of the users who has voted for this option
      options: data.pollData.options.map(opt => ({ ...opt, voted: [] }))
    }
  } else if (type === MESSAGE_TYPES.NOTIFICATION) {
    const params = {
      channelName: state?.attributes.name,
      channelDescription: state?.attributes.description,
      ...data.notification
    }
    delete params.type
    newMessage.notification = { type: data.notification.type, params }
  } else if (type === MESSAGE_TYPES.INTERACTIVE) {
    newMessage.proposal = data.proposal
  }
  return newMessage
}

export async function postLeaveChatRoomCleanup (contractID: string, state: Object) {
  if (await sbp('chelonia/contract/isSyncing', contractID, { firstSync: true })) {
    return
  }

  sbp('gi.actions/identity/kv/deleteChatRoomUnreadMessages', { contractID }).catch((e) => {
    console.error('[leaveChatroom] Error at deleteChatRoomUnreadMessages ', contractID, e)
  })
  sbp('okTurtles.events/emit', NEW_CHATROOM_SCROLL_POSITION, { chatRoomID: contractID })
  // NOTE: The contract that keeps track of chatrooms should now call `/release`
  // This would be the group contract (for group chatrooms) or the identity
  // contract (for DMs).
}

export function findMessageIdx (hash: string, messages: Array<Object> = []): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].hash === hash) {
      return i
    }
  }
  return -1
}

export function makeMentionFromUserID (userID: string): {
  me: string, all: string
} {
  return {
    me: userID ? `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}${userID}` : '',
    all: `${CHATROOM_MEMBER_MENTION_SPECIAL_CHAR}all`
  }
}

export const validateChatRoomName = (name: string) => {
  // Validation on the chatroom name - references:
  // https://github.com/okTurtles/group-income/issues/1987
  // https://github.com/okTurtles/group-income/issues/2999
  const nameValidationMap: {[string]: Function} = {
    [L('Chatroom name cannot contain white-space')]: (v: string): boolean => /\s/.test(v),
    [L('Chatroom name can only contain lowercase letters, numbers, and hyphens(-)')]: (v: string): boolean => /[^a-z0-9-]/g.test(v)
  }

  for (const key in nameValidationMap) {
    const check = nameValidationMap[key]
    if (check(name)) {
      throw new TypeError(key)
    }
  }
}

// The `referenceTally` function is meant as an utility function to handle
// reference counting in contracts that import other contracts.
// The selector returned is to be called in side-effects that 'retain' or
// 'release' other contracts, and it works by pushing a single callback into
// the contract queue that maintains a temporary reference count to be applied
// at the end of a chain processing events.
// For example, a chatroom supports the 'join' and 'leave' actions, and those
// call 'retain' or 'release', respectively, on the identity contracts of
// members.
// Now, imagine this sequence of events: `[join, leave, join, leave]` (all
// involving the same member).
// Imagine all actions are processed at once (for example, the chatroom is being
// synced from scratch). By calling the `referenceTally` selector, this would
// happen in the event queue:
//   queue slot 0: [sync]:
//        (join)    event 0: [process]
//                  event 0: [sideEffect]: this calls `referenceTally`, which
//                             increases the temp count to 1 and pushes a
//                             function into the queue.
//        (leave)   event 1: [process]
//                  event 1: [sideEffect]: this calls `referenceTally`, which
//                             decreases the temp count to 0. No function is
//                             pushed into the queue as one already exists.
//        (join)    event 2: [process]
//                  event 2: [sideEffect]: this calls `referenceTally`, which
//                             increases the temp count to 1. No function is
//                             pushed into the queue as one already exists.
//        (leave)   event 3: [process]
//                  event 3: [sideEffect]: this calls `referenceTally`, which
//                             decreases the temp count to 0. No function is
//                             pushed into the queue as one already exists.
//   queue slot 1: [referenceTally]: Function pushed onto the queue by event 0.
//                              Since the temp count is 0, no call to retain
//                              or release happens.
//
// Now, imagine a different scenario, where the same events happen but they are
// processed differently. Let's say that the grouping is:
//    1. [join, leave]
//    2. [join]
//    3. [leave]
// This situation could happen when syncing the chatroom from scratch (with
// only the first two events having happened at this point in time) with the
// other events being received over the web socket later.
//   queue slot 0: [sync]:
//        (join)    event 0: [process]
//                  event 0: [sideEffect]: this calls `referenceTally`, which
//                             increases the temp count to 1 and pushes a
//                             function into the queue.
//        (leave)   event 1: [process]
//                  event 1: [sideEffect]: this calls `referenceTally`, which
//                             decreases the temp count to 0. No function is
//                             pushed into the queue as one already exists.
//   queue slot 1: [referenceTally]: Function pushed onto the queue by event 0.
//                              Since the temp count is 0, no call to retain
//                              or release happens.
//   queue slot 2: [sync]:
//        (join)    event 2: [process]
//                  event 2: [sideEffect]: this calls `referenceTally`, which
//                             increases the temp count to and pushes a
//                             function into the queue.
//   queue slot 3: [referenceTally]: Function pushed onto the queue by event 2.
//                              Since the temp count is 1, retain is called.
//   queue slot 4: [sync]:
//        (leave)   event 3: [process]
//                  event 3: [sideEffect]: this calls `referenceTally`, which
//                             decreases the temp count to -1 and pushes a
//                             function into the queue.
//   queue slot 5: [referenceTally]: Function pushed onto the queue by event 3.
//                              Since the temp count is -1, release is called.
export const referenceTally = (selector: string): Object => {
  const delta = {
    'retain': 1,
    'release': -1
  }
  return {
    [selector]: (parentContractID: string, childContractIDs: string | string[], op: 'retain' | 'release') => {
      if (!Array.isArray(childContractIDs)) childContractIDs = [childContractIDs]
      if (op !== 'retain' && op !== 'release') throw new Error('Invalid operation')
      for (const childContractID of childContractIDs) {
        const key = `${selector}-${parentContractID}-${childContractID}`
        const count = sbp('okTurtles.data/get', key)
        sbp('okTurtles.data/set', key, (count || 0) + delta[op])
        if (count != null) return
        sbp('chelonia/queueInvocation', parentContractID, () => {
          const count = sbp('okTurtles.data/get', key)
          sbp('okTurtles.data/delete', key)
          if (count && count !== Math.sign(count)) {
            console.warn(`[${selector}] Unexpected value`, parentContractID, childContractID, count)
            // If we're running tests, we enforce checking that the temporary
            // count _must_ be either of 0, 1 or -1. This is a correct
            // assumption, based on the fact that a single contract should only
            // call retain or release at most once after all operations are
            // processed, per chunk of operations (e.g., there is no valid
            // reason for a group contract to call `retain` twice on the same
            // contract ID, without having called `release` first).
            // This rule (or assumption) also applies to non-CI environments,
            // but we are more lax in this case to allow for more leniency when
            // running contracts with real users. However, this type of error
            // indicates faulty reference bookkeeping that must be corrected.
            if (process.env.CI) {
              Promise.reject(new Error(`[${selector}] Unexpected value ${parentContractID} ${childContractID}: ${count}`))
            }
          }
          switch (Math.sign(count)) {
            case -1:
              sbp('chelonia/contract/release', childContractID).catch(e => {
                console.error(`[${selector}] Error calling release`, parentContractID, childContractID, e)
              })
              break
            case 1:
              sbp('chelonia/contract/retain', childContractID).catch(e => console.error(`[${selector}] Error calling retain`, parentContractID, childContractID, e))
              break
          }
        }).catch(e => {
          console.error(`[${selector}] Error in queued invocation`, parentContractID, childContractID, e)
        })
      }
    }
  }
}
