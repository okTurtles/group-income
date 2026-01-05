'use strict'

import type { Key } from '@chelonia/crypto'
import { CURVE25519XSALSA20POLY1305, EDWARDS25519SHA512BATCH, keyId, keygen, serializeKey } from '@chelonia/crypto'
import { GIErrorUIRuntimeError, L, LError } from '@common/common.js'
import {
  CHATROOM_PRIVACY_LEVEL,
  INVITE_INITIAL_CREATOR,
  INVITE_EXPIRES_IN_DAYS,
  MAX_GROUP_MEMBER_COUNT,
  MESSAGE_TYPES,
  PROFILE_STATUS,
  PROPOSAL_GENERIC,
  PROPOSAL_GROUP_SETTING_CHANGE,
  PROPOSAL_INVITE_MEMBER,
  PROPOSAL_PROPOSAL_SETTING_CHANGE,
  PROPOSAL_REMOVE_MEMBER,
  STATUS_OPEN,
  STATUS_PASSED,
  STATUS_FAILED,
  STATUS_EXPIRING,
  STATUS_EXPIRED,
  STATUS_CANCELLED
} from '@model/contracts/shared/constants.js'
import { merge, omit, randomIntFromRange } from 'turtledash'
import { DAYS_MILLIS, addTimeToDate, dateToPeriodStamp } from '@model/contracts/shared/time.js'
import proposals, { oneVoteToFail, oneVoteToPass } from '@model/contracts/shared/voting/proposals.js'
import { VOTE_FOR } from '@model/contracts/shared/voting/rules.js'
import sbp from '@sbp/sbp'
import {
  ACCEPTED_GROUP,
  JOINED_CHATROOM,
  JOINED_GROUP,
  LEFT_GROUP,
  LOGOUT
} from '@utils/events.js'
import { imageUpload } from '@utils/image.js'
import { SPMessage } from '@chelonia/lib/SPMessage'
import { Secret } from '@chelonia/lib/Secret'
import type { ChelKeyRequestParams } from '@chelonia/lib'
import { encryptedOutgoingData, encryptedOutgoingDataWithRawKey } from '@chelonia/lib/encryptedData'
import { CHELONIA_RESET, CONTRACT_HAS_RECEIVED_KEYS, EVENT_HANDLED } from '@chelonia/lib/events'
import type { GIActionParams } from './types.js'
import { createInvite, encryptedAction } from './utils.js'
import { extractProposalData } from '@model/notifications/utils.js'

sbp('okTurtles.events/on', LEFT_GROUP, ({ identityContractID, groupContractID }) => {
  const rootState = sbp('chelonia/rootState')
  if (!rootState.notifications || rootState.loggedIn?.identityContractID !== identityContractID) return
  const notificationHashes = rootState.notifications.items.filter(item => item.groupID === groupContractID).map(item => item.hash)
  sbp('gi.notifications/remove', notificationHashes)
})

const JOINED_FAILED_KEY = 'gi.actions/group/join/failed'
let reattemptTimeoutId

sbp('okTurtles.events/on', CHELONIA_RESET, () => {
  sbp('okTurtles.data/delete', JOINED_FAILED_KEY)
})

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
    let finalPicture = `${self.location.origin}/assets/images/group-avatar-default.png`

    const rootState = sbp('chelonia/rootState')
    const userID = rootState.loggedIn.identityContractID

    if (picture) {
      try {
        finalPicture = await imageUpload(picture, { billableContractID: userID })
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
    const SAK = keygen(EDWARDS25519SHA512BATCH)

    // Key IDs
    const CSKid = keyId(CSK)
    const CEKid = keyId(CEK)
    const inviteKeyId = keyId(inviteKey)
    const SAKid = keyId(SAK)

    // Public keys to be stored in the contract
    const CSKp = serializeKey(CSK, false)
    const CEKp = serializeKey(CEK, false)
    const inviteKeyP = serializeKey(inviteKey, false)
    const SAKp = serializeKey(SAK, false)

    // Secret keys to be stored encrypted in the contract
    const CSKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CSK, true))
    const CEKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(CEK, true))
    const inviteKeyS = encryptedOutgoingDataWithRawKey(CEK, serializeKey(inviteKey, true))
    const SAKs = encryptedOutgoingDataWithRawKey(CEK, serializeKey(SAK, true))

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
      await sbp('chelonia/storeSecretKeys',
        new Secret([CEK, CSK].map(key => ({ key, transient: true })))
      )

      const userCSKid = await sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')
      if (!userCSKid) throw new Error('User CSK id not found')

      const userCEKid = await sbp('chelonia/contract/currentKeyIdByName', userID, 'cek')
      if (!userCEKid) throw new Error('User CEK id not found')

      const message = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/group',
        publishOptions: {
          billableContractID: userID,
          ...publishOptions
        },
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
            permissions: '*',
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
            permissions: [SPMessage.OP_KEY_REQUEST],
            meta: {
              quantity: MAX_GROUP_MEMBER_COUNT,
              ...(INVITE_EXPIRES_IN_DAYS.ON_BOARDING && {
                expires:
                await sbp('chelonia/time') + DAYS_MILLIS * INVITE_EXPIRES_IN_DAYS.ON_BOARDING
              }),
              private: {
                content: inviteKeyS
              }
            },
            data: inviteKeyP
          },
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
          invites: {
            [inviteKeyId]: {
              creatorID: INVITE_INITIAL_CREATOR,
              inviteKeyId
            }
          },
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
          },
          groupOwnerID: userID
        }
      })

      const contractID = message.contractID()

      // After the contract has been created, store pesistent keys
      await sbp('chelonia/storeSecretKeys',
        new Secret([CEK, CSK, inviteKey].map(key => ({ key })))
      )

      // Using ephemeral retain-release to wait until the newly created group
      // is synced, which includes creating the #general chatroom
      await sbp('chelonia/contract/retain', contractID, { ephemeral: true })
      // The #general chatroom is created as a side-effect, which could take
      // a bit to be done
      await Promise.race([
        (async () => {
          for (let i = 0; i < 10; i++) {
            // Wait for outgoing actions to be sent (e.g., to the new chatroom
            // or to the group)
            await sbp('okTurtles.eventQueue/queueEvent', 'encrypted-action', () => {})
            await sbp('chelonia/contract/wait', contractID)
            const rootState = sbp('chelonia/rootState')
            if (rootState[contractID]?.generalChatRoomId) {
              return
            }
            // Extra wait to account for network delays
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          throw new Error('#General still not found')
        })(),
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Waiting for chatroom creation is taking too long')), 5000)
        })
      ]).catch((e) => {
        console.error('Error waiting for new group contract to be ready', e)
      })
      try {
        await sbp('gi.actions/identity/joinGroup', {
          contractID: userID,
          data: {
            groupContractID: contractID,
            inviteSecret: serializeKey(CSK, true),
            creatorID: true
          }
        })
      } finally {
        await sbp('chelonia/contract/release', contractID, { ephemeral: true })
      }

      return message.contractID()
    } catch (e) {
      console.error('gi.actions/group/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create the group: {reportError}', LError(e)))
    }
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
  'gi.actions/group/join': function (params: $Exact<ChelKeyRequestParams>) {
    // This wrapper ensures that all join actions for the same contract happen in
    // order. Because join is complex and there are many async steps involved,
    // multiple calls to join for the same contract can result in conflicting with
    // each other
    return sbp('okTurtles.eventQueue/queueEvent', `JOIN_GROUP-${params.contractID}`, async () => {
      console.debug('[gi.actions/group/join] Scheduled call starting', params.contractID, params)
      const { loggedIn } = sbp('chelonia/rootState')
      if (!loggedIn) throw new Error('[gi.actions/group/join] Not logged in')
      const { identityContractID: userID } = loggedIn
      // We want to process any current events first, so that we process leave
      // actions and don't interfere with the leaving process (otherwise, the
      // side-effects could prevent us from fully leaving).
      await sbp('chelonia/contract/wait', [params.originatingContractID, params.contractID])

      // When syncing the group contract, the contract might call /remove on
      // itself if we had previously joined and left the group. By using
      // ephemeral we ensure that it's not deleted until we've finished
      // trying to join.
      // We use a Set as normally params.originatingContractID and userID will
      // be the same
      const retainedContracts = [...new Set([params.contractID, params.originatingContractID])]
      await sbp('chelonia/contract/retain', retainedContracts, { ephemeral: true })
      try {
        const rootState = sbp('chelonia/rootState')
        if (!rootState.contracts[params.contractID]) {
          console.warn('[gi.actions/group/join] The group contract was removed after sync. If this happened during logging in, this likely means that we left the group on a different session.', { contractID: params.contractID })
          return
        }

        if (rootState.contracts[params.contractID].type !== 'gi.contracts/group') {
          throw Error(`Contract ${params.contractID} is not a group`)
        }

        // At this point, we do not know whether we should continue with the
        // join process, because we don't know where we stand in the process.
        // One edge case we need to handle is that according to our records
        // (in the identity contract) we're members, and we have completed
        // all of the steps for joining in the past, but we've then been removed
        // while we were offline. In this case, we should *not* re-join
        // automatically, even if we have a valid invitation secret and are
        // technically able to. However, in the previous situation we *should*
        // attempt to rejoin if the action was user-initiated.
        const hasKeyShareBeenRespondedBy = await sbp('chelonia/contract/hasKeyShareBeenRespondedBy', userID, params.contractID, params.reference)

        const state = rootState[params.contractID]

        // Do we have the secret keys with the right permissions to be able to
        // perform all operations in the group? If we haven't, we are not
        // able to participate in the group yet and may need to send a key
        // request.
        const hasSecretKeys = await sbp('chelonia/contract/receivedKeysToPerformOperation', userID, state, '*')

        // Do we need to send a key request?
        // If we don't have the group contract in our state and
        // params.originatingContractID is set, it means that we're joining
        // through an invite link, and we must send a key request to complete
        // the joining process.
        const sendKeyRequest = (!hasKeyShareBeenRespondedBy && !hasSecretKeys && !!params.originatingContractID)
        const pendingKeyShares = await sbp('chelonia/contract/waitingForKeyShareTo', state, userID, params.reference)

        // If we are expecting to receive keys, set up an event listener
        // We are expecting to receive keys if:
        //   (a) we are about to send a key request; or
        //   (b) we have already sent a key request (!!pendingKeyRequests?.length)
        if (sendKeyRequest || pendingKeyShares) {
        // Event handler for continuing the join process if the keys are
        // shared with us during the current session
          const eventHandler = ({ contractID, sharedWithContractID, signingKeyName }) => {
            if (contractID !== params.contractID || sharedWithContractID !== userID || (pendingKeyShares && !pendingKeyShares.includes(signingKeyName))) {
              return
            }

            removeEventHandler()
            removeLogoutHandler()
            // The event handler recursively calls this same selector
            // A different path should be taken, since te event handler
            // should be called after the key request has been answered
            // and processed
            sbp('gi.actions/group/join', params).catch((e) => {
              console.error('[gi.actions/group/join] Error during join (inside CONTRACT_HAS_RECEIVED_KEYS event handler)', e)
            })
          }
          const logoutHandler = () => {
            removeEventHandler()
          }

          // The event handler is configured before sending the request
          // to avoid race conditions
          const removeLogoutHandler = sbp('okTurtles.events/once', LOGOUT, logoutHandler)
          const removeEventHandler = sbp('okTurtles.events/on', CONTRACT_HAS_RECEIVED_KEYS, eventHandler)
        }

        // !sendKeyRequest && !(hasSecretKeys && !pendingKeyShares) && !(!hasSecretKeys && !pendingKeyShares) && !pendingKeyShares

        // After syncing the group contract, we send a key request
        if (sendKeyRequest) {
        // Send the key request
        // **IMPORTANT**: DO NOT AWAIT ON /join from a function that is
        // already waiting on the identity contract. Details:
        // The way that chelonia/out/keyRequest works is by sending two
        // messages to connect both contracts together.
        // The first step is adding a new key to the identity contract.
        // This new key has OP_KEY_SHARE permissions, as well as the
        // permissions specified in the parameters.
        // The second stap is sending an OP_KEY_REQUEST message to the
        // group contract.
        // Note that this is a two-step process that involves writing to
        // two contracts: the current group contract and the originating
        // (identity) contract. Calls to keyRequest require
        // simultaneously waiting on the group and the identity
        // (originating) contract.
          await sbp('chelonia/out/keyRequest', {
            ...omit(params, ['options']),
            innerEncryptionKeyId: await sbp('chelonia/contract/currentKeyIdByName', params.contractID, 'cek'),
            reference: params.reference,
            encryptKeyRequestMetadata: true,
            hooks: {
              prepublish: params.hooks?.prepublish,
              postpublish: null
            }
          }).catch((e) => {
            console.error(`[gi.actions/group/join] Error while sending key request for ${params.contractID}:`, e?.message || e, e)
            throw e
          })

          // Nothing left to do until the keys are received

          // Called after logging in or during an existing session from the event
          // handler above. It handles the tasks related to joining the group for
          // the first time (if that's the case) or just sets this group as the
          // current group.
          // This block must be run after having received the group's secret keys
          // (i.e., the CSK and the CEK) that were requested earlier.
        } else if (hasSecretKeys && !pendingKeyShares) {
        // We're joining for the first time
        // In this case, we share our profile key with the group, call the
        // inviteAccept action and join the General chatroom
          if (state.profiles?.[userID]?.status !== PROFILE_STATUS.ACTIVE) {
          // All reads are done here at the top to ensure that they happen
          // synchronously, before any await calls.
          // If reading after an asynchronous operation, we might get inconsistent
          // values, as new operations could have been received on the contract
            const CEKid = await sbp('chelonia/contract/currentKeyIdByName', params.contractID, 'cek')
            const PEKid = await sbp('chelonia/contract/currentKeyIdByName', userID, 'pek')
            const CSKid = await sbp('chelonia/contract/currentKeyIdByName', params.contractID, 'csk')
            const userCSKid = await sbp('chelonia/contract/currentKeyIdByName', userID, 'csk')
            const userCSKdata = rootState[userID]._vm.authorizedKeys[userCSKid].data

            try {
              const existingForeignKeys = await sbp('chelonia/contract/foreignKeysByContractID', params.contractID, userID)

              await sbp('chelonia/out/atomic', {
                ...omit(params, ['options', 'action', 'hooks', 'encryptionKeyId', 'signingKeyId']),
                data: [
                  // Share our PEK with the group so that group members can see
                  // our name and profile information
                  PEKid && await sbp('gi.actions/out/shareVolatileKeys', {
                    contractID: params.contractID,
                    contractName: 'gi.contracts/group',
                    subjectContractID: userID,
                    keyIds: [PEKid],
                    returnInvocation: true
                  }),
                  // Check to avoid adding existing keys to the contract
                  !existingForeignKeys?.includes(userCSKid) && ['chelonia/out/keyAdd', {
                    contractID: params.contractID,
                    contractName: 'gi.contracts/group',
                    data: [encryptedOutgoingData(params.contractID, CEKid, {
                      foreignKey: `shelter:${encodeURIComponent(userID)}?keyName=${encodeURIComponent('csk')}`,
                      id: userCSKid,
                      data: userCSKdata,
                      permissions: [SPMessage.OP_ACTION_ENCRYPTED + '#inner'],
                      allowedActions: '*',
                      purpose: ['sig'],
                      ringLevel: Number.MAX_SAFE_INTEGER,
                      name: `${userID}/${userCSKid}`
                    })],
                    signingKeyId: CSKid
                  }],
                  // Send inviteAccept action to the group to add ourselves to the members list
                  await sbp('gi.actions/group/inviteAccept', {
                    ...omit(params, ['options', 'action', 'hooks', 'encryptionKeyId', 'signingKeyId']),
                    data: {
                      // The 'reference' value is used to help keep group joins
                      // updated. A matching value is required when leaving a group,
                      // which prevents us from accidentally leaving a group due to
                      // a previous leave action when re-joining
                      reference: rootState[userID].groups[params.contractID].hash
                    },
                    returnInvocation: true
                  })
                ].filter(Boolean),
                signingKeyId: CSKid,
                hooks: {
                  prepublish: params.hooks?.prepublish,
                  postpublish: null
                }
              })

              // lastLoggedIn defaults to join date, hence there's no need to set
              // it here
            } catch (e) {
              console.error(`[gi.actions/group/join] Error while accepting invite ${params.contractID}:`, e)
              throw e
            }
          }

          await sbp('chelonia/contract/wait', params.contractID)
          sbp('okTurtles.events/emit', JOINED_GROUP, { identityContractID: userID, groupContractID: params.contractID })
          // We don't have the secret keys and we're not waiting for OP_KEY_SHARE
          // This means that we've been removed from the group
        } else if (!hasSecretKeys && !pendingKeyShares) {
        // We have already sent a key request that hasn't been answered. We cannot
        // do much at this point, so we do nothing.
        // This could happen, for example, after logging in if we still haven't
        // received a response to the key request.
        } else if (pendingKeyShares) {
          console.info('Requested to join group but already waiting for OP_KEY_SHARE. contractID=' + params.contractID)
        } else {
          console.error('Requested to join group but the state appears invalid. This should be unreachable. contractID=' + params.contractID, { sendKeyRequest, hasSecretKeys, pendingKeyShares })
        }
      } catch (e) {
        console.error('gi.actions/group/join failed!', e)
        throw e
      } finally {
      // If we called join but it didn't result in any actions being sent, we
      // may have left the group. In this case, we execute any pending /remove
      // actions on the contract. This will have no side-effects if /remove on
      // the group contract hasn't been called.
        await sbp('chelonia/contract/release', retainedContracts, { ephemeral: true })
      }
    }).then(() => {
      const map: Map<string, any> = sbp('okTurtles.data/get', JOINED_FAILED_KEY)
      map?.delete(params.contractID)
    }).catch(e => {
      let map: Map<string, any> = sbp('okTurtles.data/get', JOINED_FAILED_KEY)
      if (!map) {
        map = new Map()
        sbp('okTurtles.data/set', JOINED_FAILED_KEY, map)
      }

      map.set(params.contractID, params)

      const scheduleReattempt = () => {
        if (reattemptTimeoutId === undefined) {
          reattemptTimeoutId = setTimeout(() => {
            reattemptTimeoutId = undefined
            if (map.size === 0) return

            sbp('gi.actions/group/reattemptFailedJoins').catch(e => {
              console.error('Error running reattemptFailedJoins', e)
              scheduleReattempt()
            })
          }, 60e3)
        }
      }
      scheduleReattempt()

      throw e
    })
  },
  'gi.actions/group/joinWithInviteSecret': async function (groupId: string, secret: string) {
    const identityContractID = sbp('state/vuex/state').loggedIn.identityContractID

    // This action (`joinWithInviteSecret`) can get invoked while there are
    // events being processed in the group or identity contracts. This can cause
    // issues when re-joining a group, because the logic that keeps track
    // of adding or removing groups from the identity contract may interfere,
    // making us leave the group that we're trying to rejoin (what happens is
    // (1) old group leave (2) leave in identity contract (3) join in identity
    // contract (4) because of some other sync in the group contract, leave again
    // on the identity contract, which is an error)
    // We can avoid this by waiting on both contracts, especially the group
    // contract.
    await sbp('chelonia/contract/wait', [groupId, identityContractID])
    try {
      // Similarly, because not all events may have been processed, including
      // side-effects, the group contract may be released too early (when
      // re-joining a group, there could be an action for leaving the
      // group that is pending processing). The following pattern (ephemeral
      // retain + ephemeral release) ensures that we won't unsubscribe to it
      // until we know what the next step is.
      // Because the retain is paired with a release, at worst this will have
      // no effect on the lifetime of the group contract.
      await sbp('chelonia/contract/retain', groupId, { ephemeral: true })
      await sbp('gi.actions/identity/joinGroup', {
        contractID: identityContractID,
        contractName: 'gi.contracts/identity',
        data: {
          groupContractID: groupId,
          inviteSecret: secret
        }
      })
    } finally {
      await sbp('chelonia/contract/release', groupId, { ephemeral: true })
    }
  },
  'gi.actions/group/reattemptFailedJoins': async function () {
    const ourGroups = sbp('state/vuex/getters').ourGroups
    const map: Map<string, any> = sbp('okTurtles.data/get', JOINED_FAILED_KEY)
    if (!map) return

    return await Promise.allSettled([...map.entries()].map(([contractID, params]) => {
      if (!ourGroups.includes(contractID)) {
        map.delete(contractID)
        return undefined
      }

      return sbp('gi.actions/group/join', params).catch(e => {
        console.error('Error on group join re-attempt', params, e)

        throw e
      })
    })).then((results) => {
      if (results.some(result => result.status === 'rejected')) {
        throw new Error('Error on group join re-attempt')
      }
    })
  },
  'gi.actions/group/shareNewKeys': async (contractID: string, newKeys) => {
    const state = sbp('chelonia/contract/state', contractID)
    const mainCEKid = await sbp('chelonia/contract/currentKeyIdByName', state, 'cek')

    // $FlowFixMe
    return Promise.all(
      Object.entries(state.profiles)
        .filter(([_, p]) => (p: any).status === PROFILE_STATUS.ACTIVE)
        .map(async ([pContractID]) => {
          const retained = await sbp('chelonia/contract/retain', pContractID, { ephemeral: true }).then(() => [true], (e) => [false, e])
          if (!retained[0]) {
            const e = retained[1]
            if (e?.name === 'ChelErrorResourceGone') {
              console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: ${pContractID} does not exist`, e)
            } else {
              console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: Error retaining ${pContractID}`, e)
            }
            return
          }
          try {
            const CEKid = await sbp('chelonia/contract/currentKeyIdByName', pContractID, 'cek')
            if (!CEKid) {
              console.warn(`Unable to share rotated keys for ${contractID} with ${pContractID}: Missing CEK`)
              return
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
              }]
          } finally {
            await sbp('chelonia/contract/release', pContractID, { ephemeral: true })
          }
        })).then((keys) => [keys.filter(Boolean)])
  },
  ...encryptedAction('gi.actions/group/addChatRoom', L('Failed to add chat channel'), async function (sendMessage, params) {
    const rootState = sbp('chelonia/rootState')
    const contractState = rootState[params.contractID]
    const userID = rootState.loggedIn.identityContractID
    for (const contractId in contractState.chatRooms) {
      if (params.data.attributes.name.toUpperCase().normalize() === contractState.chatRooms[contractId].name.toUpperCase().normalize()) {
        throw new GIErrorUIRuntimeError(L('Duplicate channel name'))
      }
    }

    const cskId = await sbp('chelonia/contract/currentKeyIdByName', contractState, 'csk')
    const csk = {
      id: cskId,
      foreignKey: `shelter:${encodeURIComponent(params.contractID)}?keyName=${encodeURIComponent('csk')}`,
      data: contractState._vm.authorizedKeys[cskId].data
    }

    const cekId = await sbp('chelonia/contract/currentKeyIdByName', contractState, 'cek')
    const cek = {
      id: cekId,
      foreignKey: `shelter:${encodeURIComponent(params.contractID)}?keyName=${encodeURIComponent('cek')}`,
      data: contractState._vm.authorizedKeys[cekId].data
    }

    // For 'public' and 'group' chatrooms, use the group's CSK and CEK
    const privateChatroom = ![CHATROOM_PRIVACY_LEVEL.GROUP, CHATROOM_PRIVACY_LEVEL.PUBLIC].includes(params.data.attributes.privacyLevel)

    const message = await sbp('gi.actions/chatroom/create', {
      data: {
        ...params.data,
        attributes: {
          adminIDs: [contractState.groupOwnerID],
          ...params.data?.attributes
        }
      },
      options: {
        ...params.options,
        // The CSK and the CEK are the group's for non-private chatrooms
        // Otherwise, these are different from the group's, but they're still
        // passed as groupKeys, so that membership operations can be mirrored
        ...(!privateChatroom
          ? {
              csk, cek
            }
          : {
              groupKeys: [csk, cek]
            })
      },
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    }, params.contractID)

    // When creating a public chatroom, that chatroom's secret keys are shared
    // with the group (i.e., they are literally the same keys, using the
    // foreignKey functionality). However, private chatrooms keep separate keys
    // which must be shared using OP_KEY_SHARE
    if (privateChatroom) {
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
    const rootState = sbp('chelonia/rootState')
    const { identityContractID } = rootState.loggedIn
    const memberID = params.data.memberID || identityContractID
    const chatRoomID = params.data.chatRoomID
    const groupContractID = params.contractID

    // If we are inviting someone else to join, we need to share the chatroom's keys
    // with them so that they are able to read messages and participate
    if (memberID !== identityContractID && rootState[chatRoomID].attributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE) {
      await sbp('gi.actions/out/shareVolatileKeys', {
        contractID: memberID,
        contractName: 'gi.contracts/identity',
        subjectContractID: chatRoomID,
        keyIds: '*'
      })
    }

    const switchChannelAfterJoined = (contractID: string) => {
      if (contractID === chatRoomID) {
        const getters = sbp('state/vuex/getters')
        if (getters.isJoinedChatRoom(contractID, identityContractID)) {
          sbp('okTurtles.events/emit', JOINED_CHATROOM, { identityContractID, groupContractID, chatRoomID })
          sbp('okTurtles.events/off', EVENT_HANDLED, switchChannelAfterJoined)
        }
      }
    }
    sbp('okTurtles.events/on', EVENT_HANDLED, switchChannelAfterJoined)

    return sendMessage({
      ...omit(params, ['options', 'action'])
    }).catch(e => {
      if (memberID !== identityContractID || e.name !== 'GIGroupAlreadyJoinedError') throw e

      const state = sbp('chelonia/contract/state', params.contractID)
      return sbp('gi.actions/chatroom/join', {
        contractID: chatRoomID,
        data: {},
        encryptionKeyName: state.chatRooms[chatRoomID].privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE ? 'group-cek' : 'cek'
      })
    })
  }),
  'gi.actions/group/addAndJoinChatRoom': async function (params: GIActionParams) {
    // Retain needed for the sync placed later to be guaranteed to work
    await sbp('chelonia/contract/retain', params.contractID, { ephemeral: true })
    try {
      const message = await sbp('gi.actions/group/addChatRoom', {
        ...omit(params, ['options', 'hooks']),
        hooks: {
          prepublish: params.hooks?.prepublish,
          postpublish: null
        }
      })

      const chatRoomID = message.contractID()

      // Sync needed here to avoid "Cannot join a chatroom which isn't part of
      // the group" error
      await sbp('chelonia/contract/sync', params.contractID)
      await sbp('gi.actions/group/joinChatRoom', {
        ...omit(params, ['options', 'data', 'hooks']),
        data: { chatRoomID },
        hooks: {
          postpublish: params.hooks?.postpublish
        }
      })

      return chatRoomID
    } finally {
      sbp('chelonia/contract/release', params.contractID, { ephemeral: true }).catch(e =>
        console.error('[gi.actions/group/addAndJoinChatRoom] Error releasing group chatroom', e)
      )
    }
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
  'gi.actions/group/removeOurselves': (params: GIActionParams) => {
    return sbp('gi.actions/group/removeMember', {
      ...omit(params, ['options', 'action']),
      data: {}
    })
  },
  ...encryptedAction('gi.actions/group/removeMember',
    (params, e) => params.data.memberID ? L('Failed to remove {memberID}: {reportError}', { memberID: params.data.memberID, ...LError(e) }) : L('Failed to leave group. {codeError}', { codeError: e.message }),
    async function (sendMessage, params, signingKeyId) {
      await sendMessage({
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
  'gi.actions/group/autobanUser': async function (message: SPMessage, error: Object, msgMeta: { signingKeyId: string, signingContractID: string, innerSigningKeyId: string, innerSigningContractID: string }, attempt = 1) {
    try {
      if (attempt === 1) {
        // to decrease likelihood of multiple proposals being created at the same time, wait
        // a random amount of time on the first call
        setTimeout(() => {
          sbp('gi.actions/group/autobanUser', message, error, msgMeta, attempt + 1)
            .catch((e) => {
              console.error('[gi.actions/group/autobanUser] Error from setTimeout callback (1st attempt)', e)
            })
        }, randomIntFromRange(0, 5000))
        return
      }
      // If we just joined, we're likely witnessing an old error that was handled
      // by the existing members, so we shouldn't attempt to participate in voting
      // in a proposal that has long since passed.
      //
      // NOTE: we cast to 'any' to work around flow errors
      //       see: https://stackoverflow.com/a/41329247/1781435
      const memberID = msgMeta && msgMeta.innerSigningContractID
      const groupID = message.contractID()
      const rootState = sbp('chelonia/rootState')
      const contractState = rootState[groupID]
      if (memberID && rootState.contracts[groupID]?.type === 'gi.contracts/group' && contractState?.profiles?.[memberID]?.status === PROFILE_STATUS.ACTIVE) {
        const rootGetters = sbp('state/vuex/getters')
        const username = rootGetters.usernameFromID(memberID)
        console.warn(`autoBanSenderOfMessage: autobanning ${memberID} (username ${username}) from ${groupID}`)
        // find existing proposal if it exists
        let [proposalHash, proposal]: [string, ?Object] = Object.entries(contractState.proposals)
          .find(([hash, prop]: [string, Object]) => (
            prop.status === STATUS_OPEN &&
            prop.data.proposalType === PROPOSAL_REMOVE_MEMBER &&
            prop.data.proposalData.memberID === memberID
          )) ?? ['', undefined]
        if (proposal) {
          // cast our vote if we haven't already cast it
          if (!proposal.votes[rootState.loggedIn.identityContractID]) {
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
                  memberID,
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
              console.error(`autoBanSenderOfMessage: max attempts reached. Error ${e.message} attempting to ban ${memberID}`, message, e)
            } else {
              const randDelay = randomIntFromRange(0, 1500)
              console.warn(`autoBanSenderOfMessage: ${e.message} attempting to ban ${memberID}, retrying in ${randDelay} ms...`, e)
              setTimeout(() => {
                sbp('gi.actions/group/autobanUser', message, error, msgMeta, attempt + 1)
                  .catch((e) => {
                    console.error('[gi.actions/group/autobanUser] Error from setTimeout callback (> 3rd attempt)', e)
                  })
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
  'gi.actions/group/notifyProposalStateInGeneralChatRoom': async function ({ groupID, proposal }: { groupID: string, proposal: Object }) {
    const { generalChatRoomId } = await sbp('chelonia/contract/state', groupID)
    return sbp('gi.actions/chatroom/addMessage', {
      contractID: generalChatRoomId,
      data: { type: MESSAGE_TYPES.INTERACTIVE, proposal }
    })
  },
  ...encryptedAction('gi.actions/group/notifyExpiringProposals', L('Failed to notify expiring proposals.'), async function (sendMessage, params) {
    const { proposals } = params.data
    await sendMessage({
      ...omit(params, ['options', 'data', 'action', 'hooks']),
      data: { proposalIds: proposals.map(p => p.proposalId) },
      hooks: {
        prepublish: params.hooks?.prepublish,
        postpublish: null
      }
    })

    for (let i = 0; i < proposals.length; i++) {
      await sbp('gi.actions/group/notifyProposalStateInGeneralChatRoom', {
        groupID: params.contractID,
        proposal: { ...proposals[i], status: STATUS_EXPIRING }
      })
    }
  }),
  ...encryptedAction('gi.actions/group/leaveChatRoom', L('Failed to leave chat channel.'), async (sendMessage, params) => {
    const state = await sbp('chelonia/contract/state', params.contractID)
    const memberID = params.data.memberID || sbp('state/vuex/state').loggedIn.identityContractID
    const joinedHeight = state.chatRooms[params.data.chatRoomID].members[memberID].joinedHeight

    // For more efficient and correct processing, augment the leaveChatRoom
    // action with the height of the join action. This helps prevent reduce
    // the logic running as side-effects when syncing contracts from scratch
    // by only considering the most recent join/leave events.
    await sendMessage({
      ...params,
      data: {
        ...params.data,
        joinedHeight
      }
    })
  }),
  ...encryptedAction('gi.actions/group/deleteChatRoom', L('Failed to delete chat channel.')),
  ...encryptedAction('gi.actions/group/invite', L('Failed to create invite.')),
  ...encryptedAction('gi.actions/group/inviteAccept', L('Failed to accept invite.'), async function (sendMessage, params) {
    const response = await sendMessage(params)
    sbp('okTurtles.events/emit', ACCEPTED_GROUP, { contractID: params.contractID })
    return response
  }),
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
  ...encryptedAction('gi.actions/group/proposal', L('Failed to create proposal.'), (sendMessage, params) => {
    const { contractID } = params
    return sendMessage({
      ...params,
      hooks: {
        onprocessed: async (message) => {
          try {
            const proposalId = message.hash()
            const state = await sbp('chelonia/contract/state', contractID)
            const proposal = state.proposals[proposalId]
            const proposalToSend = extractProposalData(proposal, { proposalId, status: STATUS_OPEN })

            await sbp('gi.actions/group/notifyProposalStateInGeneralChatRoom', { groupID: contractID, proposal: proposalToSend })
          } catch (e) {
            console.error(`[gi.actions/group/proposal] Error while notifying proposal creation in general chatroom ${contractID}:`, e)
            throw e
          }
        }
      }
    })
  }),
  ...encryptedAction('gi.actions/group/proposalVote', L('Failed to vote on proposal.'), async (sendMessage, params) => {
    const { contractID, data } = params
    const state = await sbp('chelonia/contract/state', contractID)
    const proposalHash = data.proposalHash
    const proposal = state.proposals[proposalHash]
    const type = proposal.data.proposalType

    const willBePassed = oneVoteToPass(state, proposalHash)
    const willBeFailed = oneVoteToFail(state, proposalHash)
    const isVoteFor = data.vote === VOTE_FOR
    const isVoteAgainst = !isVoteFor
    let passPayload = isVoteFor ? {} : undefined
    let proposalToSend

    if (willBePassed && isVoteFor) {
      if (type === PROPOSAL_INVITE_MEMBER) {
        passPayload = await createInvite({
          contractID,
          invitee: proposal.data.proposalData.memberName,
          creatorID: proposal.creatorID,
          expires: state.settings.inviteExpiryProposal
        })
      }

      proposalToSend = extractProposalData(proposal, { proposalId: proposalHash, status: STATUS_PASSED })
    } else if (willBeFailed && isVoteAgainst) {
      proposalToSend = extractProposalData(proposal, { proposalId: proposalHash, status: STATUS_FAILED })
    }

    const response = await sendMessage({ ...params, data: { ...data, passPayload } })

    if (proposalToSend) {
      // NOTE: sometimes 'notifyProposalStateInGeneralChatRoom' function could be called
      //       after the 'proposalVote' event is finished its processing (published, received, called process/sideEffect)
      //       it's not a big problem unless the proposal to remove someone from the group is accepted by the current vote.
      //       it's when the two messages will be created in general chatroom; one is to tells the proposal is approved
      //       and the other is to tell the member is left general chatroom.
      //       the order of two functions that will be called means the order of the two messages in general chatroom.
      //       so the order of messages isn't always same and that could cause the heisenbug below
      // https://github.com/okTurtles/group-income/tree/2226-heisenbug-in-group-chatspecjs-more-persistent-one
      await sbp('gi.actions/group/notifyProposalStateInGeneralChatRoom', {
        groupID: contractID,
        proposal: proposalToSend
      })
    }

    return response
  }),
  ...encryptedAction('gi.actions/group/proposalCancel', L('Failed to cancel proposal.'), async function (sendMessage, params) {
    const { contractID, data } = params
    const state = await sbp('chelonia/contract/state', contractID)
    const proposal = state.proposals[data.proposalHash]
    const proposalToSend = extractProposalData(proposal, { proposalId: data.proposalHash, status: STATUS_CANCELLED })

    const response = await sendMessage(params)

    await sbp('gi.actions/group/notifyProposalStateInGeneralChatRoom', { groupID: contractID, proposal: proposalToSend })

    return response
  }),
  ...encryptedAction('gi.actions/group/markProposalsExpired', L('Failed to mark proposals expired.'), async function (sendMessage, params) {
    const { contractID, data } = params
    const state = await sbp('chelonia/contract/state', contractID)

    for (const proposalHash of data.proposalIds) {
      const proposal = state.proposals[proposalHash]
      const proposalToSend = extractProposalData(proposal, { proposalId: proposalHash, status: STATUS_EXPIRED })

      await sbp('gi.actions/group/notifyProposalStateInGeneralChatRoom', { groupID: contractID, proposal: proposalToSend })
    }

    const response = await sendMessage(params)
    return response
  }),
  'gi.actions/group/_ondeleted': async (contractID: string, state: Object) => {
    const rootGetters = sbp('state/vuex/getters')
    const identityContractID = rootGetters.ourIdentityContractId
    const currentIdentityState = rootGetters.currentIdentityState

    if (!!currentIdentityState.groups?.[contractID] && !currentIdentityState.groups[contractID].hasLeft) {
      await sbp('gi.actions/identity/leaveGroup', {
        contractID: identityContractID,
        data: {
          groupContractID: contractID,
          reference: state.profiles?.[identityContractID]?.reference
        }
      }).catch(e => {
        console.warn(`[handleDeletedContract] ${e.name} thrown by gi.actions/identity/leaveGroup ${identityContractID} for ${contractID}:`, e)
      })
    }
  },
  ...encryptedAction('gi.actions/group/updateSettings', L('Failed to update group settings.')),
  ...encryptedAction('gi.actions/group/updateAllVotingRules', (params, e) => L('Failed to update voting rules. {codeError}', { codeError: e.message })),
  ...encryptedAction('gi.actions/group/updateDistributionDate', L('Failed to update group distribution date.')),
  ...encryptedAction('gi.actions/group/updateGroupInviteExpiry', L('Failed to update group invite expiry.')),
  ...((process.env.NODE_ENV === 'development' || process.env.CI) && {
    ...encryptedAction('gi.actions/group/forceDistributionDate', L('Failed to force distribution date.'))
  })
}): string[])
