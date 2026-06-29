/* eslint-env mocha */

import assert from 'node:assert'
import { applyRedactions, shortHashRedactor } from '@chelonia/lib/journal'
import {
  JOURNAL_REDACTIONS,
  JOURNAL_REDACTIONS_VERSION,
  REDACTED,
  hashRedactor,
  messageTextRedactor
} from './redactions.js'
import { clearStaleJournalsAfterRedactions } from './migration.js'
import { DEVICE_SETTINGS } from '../../utils/constants.js'

const redact = (state, contractName = 'gi.contracts/group') => applyRedactions(state, JOURNAL_REDACTIONS, contractName)

describe('journal redactions', () => {
  it('hashRedactor returns a stable 6-character short hash', () => {
    const value = { secret: 'high entropy value' }

    assert.strictEqual(hashRedactor(value), shortHashRedactor(value).slice(0, 6))
    assert.strictEqual(hashRedactor(value).length, 6)
    assert.strictEqual(hashRedactor(value), hashRedactor(value))
  })

  it('messageTextRedactor returns the message sentinel', () => {
    assert.strictEqual(messageTextRedactor('secret'), 'xxxxxxxx')
  })

  it('redacts identity profile fields while preserving stable hashes for high-entropy fields', () => {
    const original = {
      attributes: {
        username: 'alice',
        email: 'alice@example.com',
        bio: 'private bio',
        picture: { manifestCid: 'zAliceAvatar', downloadParams: { token: 'secret' } }
      },
      groups: {
        group1: { inviteSecretId: 'secret invite key' }
      },
      fileDeleteTokens: {
        zAliceAvatar: { token: 'delete-token' }
      }
    }

    const redacted = redact(original, 'gi.contracts/identity')

    assert.strictEqual(redacted.attributes.username, 'alice')
    assert.notStrictEqual(redacted.attributes.email, original.attributes.email)
    assert.strictEqual(redacted.attributes.bio, 'xxxxxxxx')
    assert.notStrictEqual(redacted.attributes.picture, original.attributes.picture)
    assert.strictEqual(typeof redacted.attributes.email, 'string')
    assert.strictEqual(redacted.attributes.email.length, 6)
    assert.strictEqual(redacted.attributes.picture.length, 6)
    assert.strictEqual(redacted.groups.group1.inviteSecretId, REDACTED)
    assert.strictEqual(redacted.fileDeleteTokens, REDACTED)
    assert.deepStrictEqual(original.attributes.picture, { manifestCid: 'zAliceAvatar', downloadParams: { token: 'secret' } })
  })

  it('redacts group financial and payment memo details', () => {
    const redacted = redact({
      settings: {
        groupName: 'Private group',
        groupPicture: { manifestCid: 'zGroupAvatar', downloadParams: { IKM: 'group-avatar-secret' } }
      },
      profiles: {
        user1: {
          incomeDetailsType: 'pledgeAmount',
          incomeAmount: 100,
          pledgeAmount: 50,
          paymentMethods: [{ name: 'Bank', value: 'acct' }],
          nonMonetaryContributions: ['childcare']
        }
      },
      payments: {
        payment1: {
          data: {
            details: { routingNumber: '123' },
            memo: 'private memo',
            amount: 25,
            txid: 'external transaction id'
          }
        }
      },
      paymentsByPeriod: {
        '2026-01': {
          haveNeedsSnapshot: [{ memberID: 'user1', amount: 100 }],
          lastAdjustedDistribution: [{ from: 'user1', to: 'user2', amount: 25 }],
          paymentsFrom: { user1: { user2: ['payment1'] } }
        }
      },
      thankYousFrom: {
        user1: { user2: 'thanks privately' }
      }
    })

    assert.strictEqual(redacted.settings.groupName, 'Private group')
    assert.strictEqual(redacted.settings.groupPicture.manifestCid, 'zGroupAvatar')
    assert.strictEqual(redacted.settings.groupPicture.downloadParams, REDACTED)
    assert.strictEqual(redacted.profiles.user1.incomeDetailsType, 'pledgeAmount')
    assert.strictEqual(redacted.profiles.user1.incomeAmount, REDACTED)
    assert.strictEqual(redacted.profiles.user1.pledgeAmount, REDACTED)
    assert.strictEqual(redacted.profiles.user1.paymentMethods, REDACTED)
    assert.deepStrictEqual(redacted.profiles.user1.nonMonetaryContributions, ['childcare'])
    assert.strictEqual(redacted.payments.payment1.data.details, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.memo, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.amount, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.txid, REDACTED)
    assert.strictEqual(redacted.paymentsByPeriod['2026-01'].haveNeedsSnapshot, REDACTED)
    assert.strictEqual(redacted.paymentsByPeriod['2026-01'].lastAdjustedDistribution, REDACTED)
    assert.deepStrictEqual(redacted.paymentsByPeriod['2026-01'].paymentsFrom, { user1: { user2: ['payment1'] } })
    assert.strictEqual(redacted.thankYousFrom.user1.user2, REDACTED)
  })

  it('redacts chat message text without removing attachment metadata or mutating input', () => {
    const original = {
      messages: [{
        text: 'secret chat',
        replyingMessage: { hash: 'h1', text: 'quoted secret' },
        pollData: {
          question: 'secret question',
          options: [{ id: 'o1', value: 'secret option' }]
        },
        proposal: {
          proposalId: 'proposal1',
          proposalData: { reason: 'private reason' }
        },
        attachments: [{
          name: 'secret.pdf',
          mimeType: 'application/pdf',
          size: 123,
          downloadData: { manifestCid: 'zAttachment', downloadParams: { IKM: 'attachment-secret' } }
        }]
      }],
      pinnedMessages: [{
        text: 'pinned secret',
        replyingMessage: { hash: 'h2', text: 'pinned quote' },
        pollData: {
          question: 'pinned question',
          options: [{ id: 'o2', value: 'pinned option' }]
        },
        proposal: {
          proposalId: 'proposal2',
          proposalData: { reason: 'pinned private reason' }
        },
        attachments: [{
          name: 'pinned.pdf',
          mimeType: 'application/pdf',
          size: 456,
          downloadData: { manifestCid: 'zPinnedAttachment', downloadParams: { IKM: 'pinned-secret' } }
        }]
      }]
    }

    const redacted = redact(original, 'gi.contracts/chatroom')

    assert.strictEqual(redacted.messages[0].text, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].replyingMessage.text, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].pollData.question, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].pollData.options[0].value, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].proposal.proposalData, REDACTED)
    assert.strictEqual(redacted.messages[0].attachments[0].name, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].attachments[0].mimeType, 'application/pdf')
    assert.strictEqual(redacted.messages[0].attachments[0].downloadData.manifestCid, 'zAttachment')
    assert.strictEqual(redacted.messages[0].attachments[0].downloadData.downloadParams, REDACTED)
    assert.strictEqual(redacted.pinnedMessages[0].text, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].replyingMessage.text, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].pollData.question, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].pollData.options[0].value, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].proposal.proposalData, REDACTED)
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].name, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].downloadData.manifestCid, 'zPinnedAttachment')
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].downloadData.downloadParams, REDACTED)
    assert.strictEqual(original.messages[0].text, 'secret chat')
    assert.deepStrictEqual(original.messages[0].attachments[0].downloadData.downloadParams, { IKM: 'attachment-secret' })
    assert.strictEqual(original.pinnedMessages[0].attachments[0].name, 'pinned.pdf')
  })

  it('redacts private key and invite material', () => {
    const original = {
      _vm: {
        authorizedKeys: {
          key1: {
            name: 'csk',
            _private: 'private key data',
            meta: {
              private: {
                content: 'secret content',
                oldKeys: 'old secret keys',
                shareable: true
              },
              public: 'metadata'
            }
          }
        },
        invites: {
          invite1: {
            inviteSecret: 'secret invite',
            creatorID: 'user1'
          }
        }
      }
    }

    const redacted = redact(original)

    assert.strictEqual(redacted._vm.authorizedKeys.key1.name, 'csk')
    assert.strictEqual(redacted._vm.authorizedKeys.key1._private, REDACTED)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.content.length, 6)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.content, hashRedactor('secret content'))
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.oldKeys.length, 6)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.oldKeys, hashRedactor('old secret keys'))
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.shareable, true)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.public, 'metadata')
    assert.strictEqual(redacted._vm.invites.invite1.inviteSecret, REDACTED)
    assert.strictEqual(redacted._vm.invites.invite1.creatorID, 'user1')
    assert.strictEqual(original._vm.authorizedKeys.key1.meta.private.content, 'secret content')
  })

  it('redacts group proposal payload and proposalData while keeping structure', () => {
    const original = {
      proposals: {
        hash1: {
          data: {
            proposalType: 'invite-member',
            proposalData: { memberName: 'bob', reason: 'private reason' }
          },
          payload: { secret: 'invite-key-material' },
          status: 'passed',
          creatorID: 'user1'
        }
      }
    }

    const redacted = redact(original)

    assert.strictEqual(redacted.proposals.hash1.payload, REDACTED)
    assert.strictEqual(redacted.proposals.hash1.data.proposalData, REDACTED)
    assert.strictEqual(redacted.proposals.hash1.data.proposalType, 'invite-member')
    assert.strictEqual(redacted.proposals.hash1.status, 'passed')
    assert.strictEqual(redacted.proposals.hash1.creatorID, 'user1')
    assert.deepStrictEqual(original.proposals.hash1.payload, { secret: 'invite-key-material' })
  })

  it('redacts chat notification channel descriptions and poll voters', () => {
    const original = {
      messages: [{
        notification: {
          type: 'GROUP_UPDATED',
          params: { channelName: 'general', channelDescription: 'private description', count: 3 }
        },
        pollData: {
          question: 'secret question',
          options: [{ id: 'o1', value: 'secret option', voted: ['alice', 'bob'] }]
        }
      }],
      pinnedMessages: [{
        notification: {
          type: 'GROUP_UPDATED',
          params: { channelName: 'pinned-channel', channelDescription: 'pinned description', count: 1 }
        },
        pollData: {
          question: 'pinned question',
          options: [{ id: 'o2', value: 'pinned option', voted: ['carol'] }]
        }
      }]
    }

    const redacted = redact(original, 'gi.contracts/chatroom')

    assert.strictEqual(redacted.messages[0].notification.params.channelDescription, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].notification.params.channelName, 'general')
    assert.strictEqual(redacted.messages[0].notification.params.count, 3)
    assert.strictEqual(redacted.messages[0].pollData.options[0].value, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].pollData.options[0].voted, REDACTED)
    assert.strictEqual(redacted.messages[0].pollData.options[0].id, 'o1')
    assert.strictEqual(redacted.pinnedMessages[0].notification.params.channelDescription, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].notification.params.channelName, 'pinned-channel')
    assert.strictEqual(redacted.pinnedMessages[0].pollData.options[0].voted, REDACTED)
    assert.deepStrictEqual(original.messages[0].pollData.options[0].voted, ['alice', 'bob'])
  })

  it('pins the redaction rule set so changes force a version review', () => {
    // When you intentionally change JOURNAL_REDACTIONS, update this list AND bump
    // JOURNAL_REDACTIONS_VERSION so persisted journals get re-cleared via
    // clearStaleJournalsAfterRedactions.
    const expectedPaths = [
      '_vm.authorizedKeys.*._private',
      '_vm.authorizedKeys.*.meta.private.content',
      '_vm.authorizedKeys.*.meta.private.oldKeys',
      '_vm.invites.*.inviteSecret',
      'attributes.bio',
      'attributes.email',
      'attributes.picture',
      'fileDeleteTokens',
      'groups.*.inviteSecretId',
      'messages.*.attachments.*.downloadData.downloadParams',
      'messages.*.attachments.*.name',
      'messages.*.notification.params.channelDescription',
      'messages.*.pollData.options.*.value',
      'messages.*.pollData.options.*.voted',
      'messages.*.pollData.question',
      'messages.*.proposal.proposalData',
      'messages.*.replyingMessage.text',
      'messages.*.text',
      'payments.*.data.amount',
      'payments.*.data.details',
      'payments.*.data.memo',
      'payments.*.data.txid',
      'paymentsByPeriod.*.haveNeedsSnapshot',
      'paymentsByPeriod.*.lastAdjustedDistribution',
      'pinnedMessages.*.attachments.*.downloadData.downloadParams',
      'pinnedMessages.*.attachments.*.name',
      'pinnedMessages.*.notification.params.channelDescription',
      'pinnedMessages.*.pollData.options.*.value',
      'pinnedMessages.*.pollData.options.*.voted',
      'pinnedMessages.*.pollData.question',
      'pinnedMessages.*.proposal.proposalData',
      'pinnedMessages.*.replyingMessage.text',
      'pinnedMessages.*.text',
      'profiles.*.incomeAmount',
      'profiles.*.paymentMethods',
      'profiles.*.pledgeAmount',
      'proposals.*.data.proposalData',
      'proposals.*.payload',
      'settings.groupPicture.downloadParams',
      'thankYousFrom.*.*'
    ]

    const actualPaths = JOURNAL_REDACTIONS.map(r => r.path).sort()
    assert.deepStrictEqual(actualPaths, expectedPaths)
  })
})

describe('clearStaleJournalsAfterRedactions migration', () => {
  const makeConfig = () => ({
    reactiveSet: (o, k, v) => { o[k] = v }
  })

  it('initializes deviceSettings and records the version when no contracts exist', () => {
    const rootState = { contracts: {} }
    let cleared = 0
    const clearJournals = () => { cleared++; return 0 }

    clearStaleJournalsAfterRedactions(rootState, makeConfig(), clearJournals)

    assert.strictEqual(cleared, 0)
    assert.strictEqual(
      rootState.deviceSettings[DEVICE_SETTINGS.JOURNAL_REDACTIONS_CLEARED],
      JOURNAL_REDACTIONS_VERSION
    )
  })

  it('clears journals and records the version when contracts exist', () => {
    const rootState = { contracts: { contract1: {} }, deviceSettings: Object.create(null) }
    let cleared = 0
    const clearJournals = () => { cleared++; return 1 }

    clearStaleJournalsAfterRedactions(rootState, makeConfig(), clearJournals)

    assert.strictEqual(cleared, 1)
    assert.strictEqual(
      rootState.deviceSettings[DEVICE_SETTINGS.JOURNAL_REDACTIONS_CLEARED],
      JOURNAL_REDACTIONS_VERSION
    )
  })

  it('is a no-op when the current version was already recorded', () => {
    const rootState = {
      contracts: { contract1: {} },
      deviceSettings: { [DEVICE_SETTINGS.JOURNAL_REDACTIONS_CLEARED]: JOURNAL_REDACTIONS_VERSION }
    }
    let cleared = 0
    const clearJournals = () => { cleared++; return 1 }

    clearStaleJournalsAfterRedactions(rootState, makeConfig(), clearJournals)

    assert.strictEqual(cleared, 0)
  })
})
