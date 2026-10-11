/* eslint-env mocha */
import assert from 'node:assert/strict'
import { selectMentionOptions, toMentionCandidate } from './mention-utils.ts'

const member = (username, displayName = username) =>
  toMentionCandidate({ memberID: `id-${username}`, username, displayName }, [username, displayName])
const all = toMentionCandidate({ memberID: '@all', displayName: 'all' }, ['all'])
const members = [member('alice'), member('bob'), member('carol'), member('lluis', 'Lluís')]
const names = (options) => options.map(item => item.displayName)

describe('selectMentionOptions', () => {
  it('lists matching members before "@all", so that Enter / Tab pick a member', () => {
    for (const [keyword, expected] of [
      ['', ['alice', 'bob', 'carol', 'Lluís', 'all']],
      ['a', ['alice', 'carol', 'all']],
      ['al', ['alice', 'all']],
      ['l', ['alice', 'carol', 'Lluís', 'all']],
      ['ll', ['Lluís', 'all']]
    ]) {
      assert.deepEqual(names(selectMentionOptions(members, all, keyword, 30)), expected, `keyword "${keyword}"`)
    }
  })

  it('offers "@all" alone when no member matches', () => {
    assert.deepEqual(names(selectMentionOptions(members, all, 'all', 30)), ['all'])
  })

  it('leaves out "@all" when it does not match or is not available', () => {
    assert.deepEqual(names(selectMentionOptions(members, all, 'bo', 30)), ['bob'])
    assert.deepEqual(names(selectMentionOptions(members, null, '', 30)), ['alice', 'bob', 'carol', 'Lluís'])
  })

  it('matches usernames and display names, ignoring case', () => {
    const options = selectMentionOptions([member('dave', 'David'), member('eve')], null, 'VID', 30)
    assert.deepEqual(names(options), ['David'])
    assert.deepEqual(names(selectMentionOptions([member('dave', 'David')], null, 'DAV', 30)), ['David'])
  })

  it('caps the results without dropping "@all"', () => {
    const many = Array.from({ length: 40 }, (_, i) => member(`user${i}`))
    const options = selectMentionOptions(many, all, '', 30)
    assert.equal(options.length, 30)
    assert.equal(options[0].displayName, 'user0')
    assert.equal(options[29].displayName, 'all')
    assert.equal(selectMentionOptions(many, null, '', 30).length, 30)
  })

  it('ignores missing names', () => {
    const noUsername = toMentionCandidate({ memberID: 'id-x', displayName: 'id-x' }, [undefined, 'id-x'])
    assert.deepEqual(noUsername.searchKeys, ['ID-X'])
  })
})
