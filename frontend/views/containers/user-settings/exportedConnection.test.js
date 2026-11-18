/* eslint-env mocha */
import assert from 'node:assert/strict'
import { connectionStatus } from '../../../../test/unit-helpers/connectionStatus.js'
import { exportedConnection } from './exportedConnection.js'

const ROOM = 'zRoom'

describe('exportedConnection', () => {
  const status = connectionStatus('open', {
    at: 5,
    since: 1,
    wanted: 4,
    missing: [ROOM],
    pending: ['zGroup', 'zDirectMessage'],
    unsubscribedSince: 2,
    degraded: true,
    heals: 1
  })

  it('counts the contract IDs without journals, and keeps every other field', () => {
    assert.deepEqual(exportedConnection(status, false), { ...status, missing: 1, pending: 2 })
  })

  it('leaves out the fields it does not know without journals', () => {
    const exported = exportedConnection({ ...status, perContract: { [ROOM]: { heals: 3 } }, lastRefusedID: ROOM }, false)
    assert.deepEqual(exported, { ...status, missing: 1, pending: 2 })
    assert.equal(JSON.stringify(exported).includes(ROOM), false)
  })

  it('leaves out lists that are not arrays', () => {
    assert.deepEqual(exportedConnection({ state: 'open', missing: ROOM, pending: null }, false), { state: 'open' })
  })

  it('exports the whole status with journals', () => {
    const extended = { ...status, lastRefusedID: ROOM }
    assert.equal(exportedConnection(extended, true), extended)
  })

  it('keeps the error of a status that could not be obtained', () => {
    const failed = { error: 'Error: Timed out getting the connection status' }
    assert.deepEqual(exportedConnection(failed, false), failed)
    assert.deepEqual(exportedConnection(failed, true), failed)
  })

  it('describes an answer that is not an object, so that the section is never left out', () => {
    for (const answer of [undefined, null, false, 'open', 3]) {
      for (const includeJournal of [false, true]) {
        assert.deepEqual(exportedConnection(answer, includeJournal), { error: `Unexpected status: ${String(answer)}` })
      }
    }
  })

  it('describes an array as an unexpected answer, without its items', () => {
    for (const includeJournal of [false, true]) {
      assert.deepEqual(exportedConnection([], includeJournal), { error: 'Unexpected status: an array of 0 item(s)' })
      assert.deepEqual(exportedConnection([ROOM], includeJournal), { error: 'Unexpected status: an array of 1 item(s)' })
    }
  })
})
