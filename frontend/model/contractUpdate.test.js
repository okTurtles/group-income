/* eslint-env mocha */

import { mayIncludeContractTypes } from './contractUpdate.js'
const should = require('should')

describe('mayIncludeContractTypes', () => {
  const state = {
    contracts: {
      g1: { type: 'gi.contracts/group' },
      c1: { type: 'gi.contracts/chatroom' },
      i1: { type: 'gi.contracts/identity' },
      i2: { type: 'gi.contracts/identity' }
    }
  }
  const types = ['gi.contracts/group', 'gi.contracts/chatroom']

  it('is true without hints', () => {
    should(mayIncludeContractTypes(state, undefined, types)).be.true()
    should(mayIncludeContractTypes(state, null, types)).be.true()
  })

  it('is false for empty hints', () => {
    should(mayIncludeContractTypes(state, [], types)).be.false()
  })

  it('is true if any of the contracts is of one of the types', () => {
    should(mayIncludeContractTypes(state, ['g1'], types)).be.true()
    should(mayIncludeContractTypes(state, ['i1', 'c1'], types)).be.true()
  })

  it('is false if all of the contracts are of other types', () => {
    should(mayIncludeContractTypes(state, ['i1', 'i2'], types)).be.false()
    should(mayIncludeContractTypes(state, ['i1'], ['gi.contracts/group'])).be.false()
  })

  it('is true for contracts whose type is not known yet', () => {
    should(mayIncludeContractTypes(state, ['i1', 'unknown'], types)).be.true()
    should(mayIncludeContractTypes({}, ['g1'], types)).be.true()
    should(mayIncludeContractTypes(undefined, ['g1'], types)).be.true()
  })
})
