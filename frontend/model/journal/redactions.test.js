/* eslint-env mocha */

import assert from 'node:assert'
import { applyRedactions, defaultDiff } from '@chelonia/lib/journal'
import {
  JOURNAL_REDACTIONS,
  JOURNAL_REDACTIONS_VERSION,
  REDACTED,
  REDACTED_TEXT,
  emoticonsRedactor,
  freeTextRedactor,
  hashRedactor,
  notificationParamsRedactor,
  pinnedMessageRedactor,
  redactedRedactor
} from './redactions.js'

const redact = (state, contractName = 'gi.contracts/group') => applyRedactions(state, JOURNAL_REDACTIONS, contractName)

describe('journal redactions', () => {
  it('hashRedactor is deterministic and distinguishes different inputs', () => {
    const value = { secret: 'high entropy value' }

    assert.strictEqual(hashRedactor(value).length, 6)
    assert.strictEqual(hashRedactor(value), hashRedactor(value))
    assert.notStrictEqual(hashRedactor(value), hashRedactor({ secret: 'other' }))
  })

  it('hashRedactor avoids the constant multiformat hash prefix', () => {
    // blake32Hash output begins with 7 constant characters (the multibase `z`
    // plus the `2Drjgb` multihash prefix), so a prefix slice is identical for
    // every input. This guards against a regression to `.slice(0, 6)`.
    const hashes = new Set()
    for (let i = 0; i < 1000; i++) hashes.add(hashRedactor(`value-${i}`))
    assert.strictEqual(hashes.size, 1000)
  })

  it('hashRedactor does not throw on unserializable input', () => {
    const cyclic = {}
    cyclic.self = cyclic
    assert.strictEqual(hashRedactor(cyclic).length, 6)
  })

  it('freeTextRedactor returns the free-text sentinel', () => {
    assert.strictEqual(freeTextRedactor('secret'), REDACTED_TEXT)
  })

  it('redacts identity profile fields while keeping the avatar manifestCid', () => {
    const original = {
      attributes: {
        username: 'alice',
        displayName: 'Alice Realname',
        email: 'alice@example.com',
        bio: 'private bio',
        picture: { manifestCid: 'zAliceAvatar', downloadParams: { token: 'secret' } }
      },
      groups: {
        // A key ID, not a secret. Hidden because it ties the identity to the
        // invite it joined with, and so to that invite's creator.
        group1: { inviteSecretId: 'z2Drjgb8FyVJq1N9rdFY7u4RVwU6Z3aqgyVZnbWe1ED5uu8YYTq' }
      },
      fileDeleteTokens: {
        zAliceAvatar: { token: 'delete-token' }
      }
    }

    const redacted = redact(original, 'gi.contracts/identity')

    assert.strictEqual(redacted.attributes.username, 'alice')
    assert.strictEqual(redacted.attributes.displayName, REDACTED_TEXT)
    assert.strictEqual(redacted.attributes.email, REDACTED)
    assert.strictEqual(redacted.attributes.bio, REDACTED_TEXT)
    assert.strictEqual(redacted.attributes.picture.manifestCid, 'zAliceAvatar')
    assert.strictEqual(redacted.attributes.picture.downloadParams, REDACTED)
    assert.strictEqual(redacted.groups.group1.inviteSecretId, REDACTED)
    assert.strictEqual(redacted.fileDeleteTokens, REDACTED)
    assert.deepStrictEqual(original.attributes.picture, { manifestCid: 'zAliceAvatar', downloadParams: { token: 'secret' } })
    // The assertions that encode the requirement: neither the address nor the
    // avatar file IKM reach the exported file in any form.
    const exported = JSON.stringify(redacted)
    assert.ok(!exported.includes('alice@'))
    assert.ok(!exported.includes('secret'))
    assert.ok(!exported.includes('Realname'))
    assert.ok(!exported.includes('z2Drjgb8FyVJ'))
  })

  it('leaves the string form of an avatar URL unredacted', () => {
    // `attributes.picture` and `settings.groupPicture` are both
    // `unionOf(string, objectOf({ manifestCid, downloadParams }))`. The string
    // form is only ever the public default-avatar URL or a user-entered image
    // URL, so it must pass through; only `downloadParams` is sensitive.
    const identity = redact({
      attributes: { username: 'alice', picture: 'https://example.com/default-avatar.png' }
    }, 'gi.contracts/identity')
    const group = redact({
      settings: { groupPicture: 'https://example.com/default-group-avatar.png' }
    })

    assert.strictEqual(identity.attributes.picture, 'https://example.com/default-avatar.png')
    assert.strictEqual(group.settings.groupPicture, 'https://example.com/default-group-avatar.png')
  })

  it('redacts group financial and payment memo details', () => {
    const redacted = redact({
      settings: {
        groupName: 'Private group',
        sharedValues: 'Secret shared values',
        mincomeAmount: 1000,
        mincomeCurrency: 'USD',
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
            txid: 'external transaction id',
            groupMincome: 1000
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
      },
      totalPledgeAmount: 12345,
      invites: {
        ik1: { inviteKeyId: 'ik1', creatorID: 'zCreator', invitee: 'Secret invitee name' }
      }
    })

    assert.strictEqual(redacted.settings.groupName, REDACTED_TEXT)
    assert.strictEqual(redacted.settings.sharedValues, REDACTED_TEXT)
    assert.strictEqual(redacted.settings.mincomeAmount, REDACTED)
    assert.strictEqual(redacted.settings.mincomeCurrency, 'USD')
    assert.strictEqual(redacted.settings.groupPicture.manifestCid, 'zGroupAvatar')
    assert.strictEqual(redacted.settings.groupPicture.downloadParams, REDACTED)
    assert.strictEqual(redacted.profiles.user1.incomeDetailsType, 'pledgeAmount')
    assert.strictEqual(redacted.profiles.user1.incomeAmount, REDACTED)
    assert.strictEqual(redacted.profiles.user1.pledgeAmount, REDACTED)
    assert.strictEqual(redacted.profiles.user1.paymentMethods, REDACTED)
    assert.deepStrictEqual(redacted.profiles.user1.nonMonetaryContributions, [REDACTED_TEXT])
    assert.strictEqual(redacted.payments.payment1.data.details, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.memo, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.amount, REDACTED)
    assert.strictEqual(redacted.payments.payment1.data.txid, REDACTED)
    // Pairs with the `settings.mincomeAmount` assertion above: the per-payment
    // snapshot must not re-leak the value the group setting hides.
    assert.strictEqual(redacted.payments.payment1.data.groupMincome, REDACTED)
    assert.strictEqual(redacted.paymentsByPeriod['2026-01'].haveNeedsSnapshot, REDACTED)
    assert.strictEqual(redacted.paymentsByPeriod['2026-01'].lastAdjustedDistribution, REDACTED)
    assert.deepStrictEqual(redacted.paymentsByPeriod['2026-01'].paymentsFrom, { user1: { user2: ['payment1'] } })
    assert.strictEqual(redacted.thankYousFrom.user1.user2, REDACTED)
    assert.strictEqual(redacted.totalPledgeAmount, REDACTED)
    assert.strictEqual(redacted.invites.ik1.invitee, REDACTED_TEXT)
    assert.strictEqual(redacted.invites.ik1.inviteKeyId, 'ik1')
    assert.strictEqual(redacted.invites.ik1.creatorID, 'zCreator')
    assert.ok(!JSON.stringify(redacted).includes('Secret'))
    assert.ok(!JSON.stringify(redacted).includes('Private group'))
  })

  it('redacts per-member payment and voting streaks but keeps group-wide ones', () => {
    const streaks = {
      lastStreakPeriod: '2026-01-01T00:00:00.000Z',
      fullMonthlyPledges: 2,
      fullMonthlySupport: 1,
      onTimePayments: { zMemberA: 3 },
      missedPayments: { zMemberB: 4 },
      noVotes: { zMemberB: 2 }
    }

    const redacted = redact({ streaks })

    assert.deepStrictEqual(redacted.streaks, {
      lastStreakPeriod: '2026-01-01T00:00:00.000Z',
      fullMonthlyPledges: 2,
      fullMonthlySupport: 1,
      onTimePayments: { zMemberA: REDACTED },
      missedPayments: { zMemberB: REDACTED },
      noVotes: { zMemberB: REDACTED }
    })
    assert.deepStrictEqual(streaks.missedPayments, { zMemberB: 4 })
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

    assert.strictEqual(redacted.messages[0].text, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].replyingMessage.text, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].pollData.question, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].pollData.options[0].value, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].proposal.proposalData, REDACTED)
    assert.strictEqual(redacted.messages[0].attachments[0].name, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].attachments[0].mimeType, 'application/pdf')
    assert.strictEqual(redacted.messages[0].attachments[0].downloadData.manifestCid, 'zAttachment')
    assert.strictEqual(redacted.messages[0].attachments[0].downloadData.downloadParams, REDACTED)
    assert.strictEqual(redacted.pinnedMessages[0].text, REDACTED_TEXT)
    assert.strictEqual(redacted.pinnedMessages[0].replyingMessage.text, REDACTED_TEXT)
    assert.strictEqual(redacted.pinnedMessages[0].pollData.question, REDACTED_TEXT)
    assert.strictEqual(redacted.pinnedMessages[0].pollData.options[0].value, REDACTED_TEXT)
    assert.strictEqual(redacted.pinnedMessages[0].proposal.proposalData, REDACTED)
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].name, REDACTED_TEXT)
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].downloadData.manifestCid, 'zPinnedAttachment')
    assert.strictEqual(redacted.pinnedMessages[0].attachments[0].downloadData.downloadParams, REDACTED)
    assert.strictEqual(original.messages[0].text, 'secret chat')
    assert.deepStrictEqual(original.messages[0].attachments[0].downloadData.downloadParams, { IKM: 'attachment-secret' })
    assert.strictEqual(original.pinnedMessages[0].attachments[0].name, 'pinned.pdf')
  })

  it('redacts reaction strings, which are object keys a path cannot reach', () => {
    // `emoticon` is validated as a bare `string` (chatroom.js), so any client
    // can use a reaction to smuggle free text into `state.messages`. The text
    // ends up as an object key, which no value-level redaction can rewrite.
    const smuggled = 'my landlord is evicting me and I need $1200 by Friday'
    const original = {
      messages: [
        {
          text: 'hi',
          emoticons: {
            '👍': ['cid1', 'cid2'],
            [smuggled]: ['cid3']
          }
        },
        { text: 'no reactions here' }
      ],
      pinnedMessages: [
        { text: 'pinned', emoticons: { 'pinned secret reaction': ['cid4'] } }
      ]
    }

    const redacted = redact(original, 'gi.contracts/chatroom')
    const exported = JSON.stringify(redacted)

    assert.deepStrictEqual(redacted.messages[0].emoticons, {
      [hashRedactor('👍')]: 2,
      [hashRedactor(smuggled)]: 1
    })
    assert.deepStrictEqual(redacted.pinnedMessages[0].emoticons, {
      [hashRedactor('pinned secret reaction')]: 1
    })
    assert.ok(!exported.includes(smuggled))
    assert.ok(!exported.includes('pinned secret reaction'))
    assert.ok(!exported.includes('👍'))
    // Reactor member IDs go with the strings: only how many reacted survives.
    assert.ok(!exported.includes('cid1'))
    // Redaction never creates a key the state didn't have.
    assert.strictEqual(redacted.messages[1].emoticons, undefined)
    assert.deepStrictEqual(original.messages[0].emoticons['👍'], ['cid1', 'cid2'])
  })

  it('emoticonsRedactor tolerates values that are not a reaction map', () => {
    assert.deepStrictEqual(emoticonsRedactor({ a: ['x'], b: [] }), {
      [hashRedactor('a')]: 1,
      [hashRedactor('b')]: 0
    })
    assert.deepStrictEqual(emoticonsRedactor({}), {})
    assert.deepStrictEqual(emoticonsRedactor(null), {})
    assert.deepStrictEqual(emoticonsRedactor(undefined), {})
    assert.deepStrictEqual(emoticonsRedactor('👍'), {})
  })

  it('keeps reaction activity visible in the journal patch', () => {
    // The reason for rebuilding the map instead of blanking it: the journal
    // diff must still show that a reaction appeared or gained a reactor.
    const messages = (emoticons) => ({ messages: [{ hash: 'h1', text: 'secret', emoticons }] })
    const patch = defaultDiff(
      redact(messages({ '👍': ['cid1'] }), 'gi.contracts/chatroom'),
      redact(messages({ '👍': ['cid1', 'cid2'], '🎉': ['cid3'] }), 'gi.contracts/chatroom')
    )

    assert.strictEqual(patch.length, 2)
    assert.deepStrictEqual(patch.find(p => p.op === 'replace'), {
      op: 'replace',
      path: `/messages/0/emoticons/${hashRedactor('👍')}`,
      value: 2
    })
    assert.deepStrictEqual(patch.find(p => p.op === 'add'), {
      op: 'add',
      path: `/messages/0/emoticons/${hashRedactor('🎉')}`,
      value: 1
    })
    assert.ok(!JSON.stringify(patch).includes('cid'))
  })

  it('redacts private key and invite material', () => {
    const original = {
      _vm: {
        authorizedKeys: {
          key1: {
            name: 'csk',
            // The ID of the key that encrypts this key's private part, not
            // key material, so it is kept for debugging key rotation.
            _private: 'z2DrjgbEFd1Ay8C5m5tssd6GCZEjhXrQnqYEs4bf4iJ1uefjjrh',
            meta: {
              private: {
                content: 'secret content',
                oldKeys: 'old secret keys',
                shareable: true
              },
              public: 'metadata'
            }
          },
          key2: {
            name: 'cek',
            meta: { private: { content: 'another secret content' } }
          },
          key3: {
            name: 'inviteKey',
            meta: { private: { content: 'a third secret content' } }
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
    assert.strictEqual(redacted._vm.authorizedKeys.key1._private, 'z2DrjgbEFd1Ay8C5m5tssd6GCZEjhXrQnqYEs4bf4iJ1uefjjrh')
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.content.length, 6)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.content, hashRedactor('secret content'))
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.oldKeys.length, 6)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.oldKeys, hashRedactor('old secret keys'))
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.private.shareable, true)
    assert.strictEqual(redacted._vm.authorizedKeys.key1.meta.public, 'metadata')
    assert.strictEqual(redacted._vm.invites.invite1.inviteSecret, REDACTED)
    assert.strictEqual(redacted._vm.invites.invite1.creatorID, 'user1')
    assert.strictEqual(original._vm.authorizedKeys.key1.meta.private.content, 'secret content')

    // Each key must hash to a different value. A degenerate redactor makes
    // every key look identical, which hides key-rotation bugs entirely.
    const hashes = ['key1', 'key2', 'key3'].map((k) => redacted._vm.authorizedKeys[k].meta.private.content)
    assert.strictEqual(new Set(hashes).size, hashes.length)
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

  it('redacts chat notification parameters and poll voters', () => {
    // `addMessage` accepts extra notification keys and `createMessage` spreads
    // them into `params`, so a param key can carry free text too.
    const smuggledKey = 'SMUGGLED KEY my secret note'
    const original = {
      messages: [{
        notification: {
          type: 'add-member',
          params: {
            channelName: 'general',
            channelDescription: 'private description',
            memberID: 'zMember',
            actorID: 'zActor',
            [smuggledKey]: 'private notification detail'
          }
        },
        pollData: {
          question: 'secret question',
          options: [{ id: 'o1', value: 'secret option', voted: ['alice', 'bob'] }]
        }
      }],
      pinnedMessages: [{
        notification: {
          type: 'add-member',
          params: {
            channelName: 'pinned-channel',
            channelDescription: 'pinned description',
            memberID: 'zMember',
            [smuggledKey]: 'pinned notification detail'
          }
        },
        pollData: {
          question: 'pinned question',
          options: [{ id: 'o2', value: 'pinned option', voted: ['carol'] }]
        }
      }]
    }

    const redacted = redact(original, 'gi.contracts/chatroom')
    const exported = JSON.stringify(redacted)

    assert.deepStrictEqual(redacted.messages[0].notification, {
      type: 'add-member',
      params: {
        channelName: REDACTED_TEXT,
        channelDescription: REDACTED_TEXT,
        memberID: REDACTED_TEXT,
        actorID: REDACTED_TEXT,
        [hashRedactor(smuggledKey)]: REDACTED_TEXT
      }
    })
    assert.strictEqual(redacted.messages[0].pollData.options[0].value, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].pollData.options[0].voted, REDACTED)
    assert.strictEqual(redacted.messages[0].pollData.options[0].id, 'o1')
    assert.deepStrictEqual(redacted.pinnedMessages[0].notification.params, {
      channelName: REDACTED_TEXT,
      channelDescription: REDACTED_TEXT,
      memberID: REDACTED_TEXT,
      [hashRedactor(smuggledKey)]: REDACTED_TEXT
    })
    assert.strictEqual(redacted.pinnedMessages[0].pollData.options[0].voted, REDACTED)
    assert.ok(!exported.includes('my secret note'))
    assert.ok(!exported.includes('private notification detail'))
    assert.ok(!exported.includes('pinned notification detail'))
    assert.deepStrictEqual(original.messages[0].pollData.options[0].voted, ['alice', 'bob'])
    assert.strictEqual(original.messages[0].notification.params[smuggledKey], 'private notification detail')
  })

  it('notificationParamsRedactor tolerates values that are not a params map', () => {
    assert.deepStrictEqual(notificationParamsRedactor({ memberID: 'zMember' }), { memberID: REDACTED_TEXT })
    assert.deepStrictEqual(notificationParamsRedactor(null), {})
    assert.deepStrictEqual(notificationParamsRedactor('free text'), {})
  })

  it('reduces fields a pinning client added to a hashed key and a redacted value', () => {
    // `pinMessage` validates its message only as `object`, so a client can pin
    // an object with fields no message has.
    const original = {
      pinnedMessages: [{
        type: 'text',
        hash: 'zMessageHash',
        height: 3,
        from: 'zSender',
        datetime: '2026-01-01T00:00:00.000Z',
        text: 'pinned secret',
        pinnedBy: 'zPinner',
        'SMUGGLED FIELD my secret note': 'PIN_SECRET_VALUE'
      }]
    }

    const redacted = redact(original, 'gi.contracts/chatroom')
    const exported = JSON.stringify(redacted)

    assert.deepStrictEqual(redacted.pinnedMessages[0], {
      type: 'text',
      hash: 'zMessageHash',
      height: 3,
      from: 'zSender',
      datetime: '2026-01-01T00:00:00.000Z',
      // The message rules still apply after the entry is rebuilt.
      text: REDACTED_TEXT,
      pinnedBy: 'zPinner',
      [hashRedactor('SMUGGLED FIELD my secret note')]: REDACTED
    })
    assert.ok(!exported.includes('my secret note'))
    assert.ok(!exported.includes('PIN_SECRET_VALUE'))
    assert.ok(!exported.includes('pinned secret'))
    assert.strictEqual(original.pinnedMessages[0].text, 'pinned secret')
  })

  it('pinnedMessageRedactor tolerates values that are not a message object', () => {
    assert.strictEqual(pinnedMessageRedactor('free text'), REDACTED)
    assert.strictEqual(pinnedMessageRedactor(['free text']), REDACTED)
    assert.strictEqual(pinnedMessageRedactor(null), REDACTED)
    assert.deepStrictEqual(pinnedMessageRedactor({}), {})
  })

  it('redacts chatroom channel name and description in every location', () => {
    const redacted = redact({
      attributes: {
        name: 'Secret channel',
        description: 'Secret purpose',
        creatorID: 'zCreator',
        type: 'group',
        privacyLevel: 'private'
      },
      messages: [{
        notification: {
          type: 'update-name',
          params: { channelName: 'Secret channel', channelDescription: 'Secret purpose' }
        }
      }],
      pinnedMessages: [{
        notification: { type: 'update-name', params: { channelName: 'Secret channel' } }
      }]
    }, 'gi.contracts/chatroom')

    assert.strictEqual(redacted.attributes.name, REDACTED_TEXT)
    assert.strictEqual(redacted.attributes.description, REDACTED_TEXT)
    assert.strictEqual(redacted.attributes.privacyLevel, 'private')
    assert.strictEqual(redacted.attributes.type, 'group')
    assert.strictEqual(redacted.attributes.creatorID, 'zCreator')
    assert.strictEqual(redacted.messages[0].notification.params.channelName, REDACTED_TEXT)
    assert.strictEqual(redacted.messages[0].notification.params.channelDescription, REDACTED_TEXT)
    assert.strictEqual(redacted.pinnedMessages[0].notification.params.channelName, REDACTED_TEXT)
    // The assertion that actually encodes the requirement: nothing sensitive
    // reaches the exported file, whatever the shape of the state.
    assert.ok(!JSON.stringify(redacted).includes('Secret'))
  })

  it('redacts group chatRooms names and descriptions', () => {
    const redacted = redact({
      chatRooms: {
        cid1: {
          name: 'Secret channel',
          description: 'Secret purpose',
          privacyLevel: 'private',
          members: {}
        }
      }
    })

    assert.strictEqual(redacted.chatRooms.cid1.name, REDACTED_TEXT)
    assert.strictEqual(redacted.chatRooms.cid1.description, REDACTED_TEXT)
    assert.strictEqual(redacted.chatRooms.cid1.privacyLevel, 'private')
    assert.ok(!JSON.stringify(redacted).includes('Secret'))
  })

  it('pins the redaction rule set together with JOURNAL_REDACTIONS_VERSION', () => {
    // When you intentionally change JOURNAL_REDACTIONS (a path OR its
    // redactor), update this list AND bump JOURNAL_REDACTIONS_VERSION, so
    // persisted journals get cleared again (see `migration.js`). This also
    // applies when a value assertion above fails after a rule change. Message
    // rules live in MESSAGE_FIELD_REDACTIONS, which generates the `messages.*`
    // and `pinnedMessages.*` pairs below.
    const redactorNames = new Map([
      [freeTextRedactor, 'text'],
      [redactedRedactor, 'redacted'],
      [hashRedactor, 'hash'],
      [emoticonsRedactor, 'emoticons'],
      [notificationParamsRedactor, 'notificationParams'],
      [pinnedMessageRedactor, 'pinnedMessage']
    ])
    const rules = JOURNAL_REDACTIONS
      .map(r => `${r.path} -> ${redactorNames.get(r.redact) ?? 'UNKNOWN'}`)
      .sort()

    assert.deepStrictEqual({ version: JOURNAL_REDACTIONS_VERSION, rules }, {
      version: 4,
      rules: [
        '_vm.authorizedKeys.*.meta.private.content -> hash',
        '_vm.authorizedKeys.*.meta.private.oldKeys -> hash',
        '_vm.invites.*.inviteSecret -> redacted',
        'attributes.bio -> text',
        'attributes.description -> text',
        'attributes.displayName -> text',
        'attributes.email -> redacted',
        'attributes.name -> text',
        'attributes.picture.downloadParams -> redacted',
        'chatRooms.*.description -> text',
        'chatRooms.*.name -> text',
        'fileDeleteTokens -> redacted',
        'groups.*.inviteSecretId -> redacted',
        'invites.*.invitee -> text',
        'messages.*.attachments.*.downloadData.downloadParams -> redacted',
        'messages.*.attachments.*.name -> text',
        'messages.*.emoticons -> emoticons',
        'messages.*.notification.params -> notificationParams',
        'messages.*.pollData.options.*.value -> text',
        'messages.*.pollData.options.*.voted -> redacted',
        'messages.*.pollData.question -> text',
        'messages.*.proposal.proposalData -> redacted',
        'messages.*.replyingMessage.text -> text',
        'messages.*.text -> text',
        'payments.*.data.amount -> redacted',
        'payments.*.data.details -> redacted',
        'payments.*.data.groupMincome -> redacted',
        'payments.*.data.memo -> redacted',
        'payments.*.data.txid -> redacted',
        'paymentsByPeriod.*.haveNeedsSnapshot -> redacted',
        'paymentsByPeriod.*.lastAdjustedDistribution -> redacted',
        'pinnedMessages.* -> pinnedMessage',
        'pinnedMessages.*.attachments.*.downloadData.downloadParams -> redacted',
        'pinnedMessages.*.attachments.*.name -> text',
        'pinnedMessages.*.emoticons -> emoticons',
        'pinnedMessages.*.notification.params -> notificationParams',
        'pinnedMessages.*.pollData.options.*.value -> text',
        'pinnedMessages.*.pollData.options.*.voted -> redacted',
        'pinnedMessages.*.pollData.question -> text',
        'pinnedMessages.*.proposal.proposalData -> redacted',
        'pinnedMessages.*.replyingMessage.text -> text',
        'pinnedMessages.*.text -> text',
        'profiles.*.incomeAmount -> redacted',
        'profiles.*.nonMonetaryContributions.* -> text',
        'profiles.*.paymentMethods -> redacted',
        'profiles.*.pledgeAmount -> redacted',
        'proposals.*.data.proposalData -> redacted',
        'proposals.*.payload -> redacted',
        'settings.groupName -> text',
        'settings.groupPicture.downloadParams -> redacted',
        'settings.mincomeAmount -> redacted',
        'settings.sharedValues -> text',
        'streaks.missedPayments.* -> redacted',
        'streaks.noVotes.* -> redacted',
        'streaks.onTimePayments.* -> redacted',
        'thankYousFrom.*.* -> redacted',
        'totalPledgeAmount -> redacted'
      ]
    })
  })
})
