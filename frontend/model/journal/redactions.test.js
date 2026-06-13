/* eslint-env mocha */

import assert from 'node:assert'
import { applyRedactions, shortHashRedactor } from '@chelonia/lib/journal'
import {
  JOURNAL_REDACTIONS,
  REDACTED,
  hashRedactor,
  messageTextRedactor
} from './redactions.js'

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
        picture: { manifestCid: 'zAliceAvatar', downloadParams: { token: 'secret' } }
      }
    }

    const redacted = redact(original, 'gi.contracts/identity')

    assert.strictEqual(redacted.attributes.username, 'alice')
    assert.notStrictEqual(redacted.attributes.email, original.attributes.email)
    assert.notStrictEqual(redacted.attributes.picture, original.attributes.picture)
    assert.strictEqual(typeof redacted.attributes.email, 'string')
    assert.strictEqual(redacted.attributes.email.length, 6)
    assert.strictEqual(redacted.attributes.picture.length, 6)
    assert.deepStrictEqual(original.attributes.picture, { manifestCid: 'zAliceAvatar', downloadParams: { token: 'secret' } })
  })

  it('redacts group financial and payment memo details', () => {
    const redacted = redact({
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
            amount: 25
          }
        }
      },
      thankYousFrom: {
        user1: { user2: 'thanks privately' }
      }
    })

    assert.strictEqual(redacted.profiles.user1.incomeDetailsType, 'pledgeAmount')
    assert.strictEqual(redacted.profiles.user1.incomeAmount, REDACTED)
    assert.strictEqual(redacted.profiles.user1.pledgeAmount, REDACTED)
    assert.strictEqual(redacted.profiles.user1.paymentMethods, REDACTED)
    assert.deepStrictEqual(redacted.profiles.user1.nonMonetaryContributions, ['childcare'])
    assert.strictEqual(redacted.payments.payment1.data.details, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.memo, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.amount, 25)
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
        attachments: [{
          name: 'secret.pdf',
          mimeType: 'application/pdf',
          size: 123,
          downloadData: { manifestCid: 'zAttachment' }
        }]
      }],
      pinnedMessages: [{
        text: 'pinned secret',
        replyingMessage: { hash: 'h2', text: 'pinned quote' },
        pollData: {
          question: 'pinned question',
          options: [{ id: 'o2', value: 'pinned option' }]
        },
        attachments: [{
          name: 'pinned.pdf',
          mimeType: 'application/pdf',
          size: 456,
          downloadData: { manifestCid: 'zPinnedAttachment' }
        }]
      }]
    }

    const redacted = redact(original, 'gi.contracts/chatroom')

    assert.strictEqual(redacted.messages[0].text, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].replyingMessage.text, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].pollData.question, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].pollData.options[0].value, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].attachments[0].name, 'xxxxxxxx')
    assert.strictEqual(redacted.messages[0].attachments[0].mimeType, 'application/pdf')
    assert.strictEqual(redacted.messages[0].attachments[0].downloadData.manifestCid, 'zAttachment')
    assert.strictEqual(redacted.pinnedMessages[0].text, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].replyingMessage.text, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].pollData.question, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].pollData.options[0].value, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].name, 'xxxxxxxx')
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].downloadData.manifestCid, 'zPinnedAttachment')
    assert.strictEqual(original.messages[0].text, 'secret chat')
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
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.shareable, true)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.public, 'metadata')
    assert.strictEqual(redacted._vm.invites.invite1.inviteSecret, REDACTED)
    assert.strictEqual(redacted._vm.invites.invite1.creatorID, 'user1')
    assert.strictEqual(original._vm.authorizedKeys.key1.meta.private.content, 'secret content')
  })
})
