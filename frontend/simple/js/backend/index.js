'use strict'

// import {Backend} from './interface'
import {HapiBackend} from './hapi'
import sbp from '../../../../shared/sbp'

const backend = new HapiBackend()
const api = {
  // TODO: add ability to unregister listeners
  '/v1/publishLogEntry': function ({contractId, entry}) {
    return backend.publishLogEntry(contractId, entry)
  },
  '/v1/latestHash': function ({contractId}) {
    return backend.latestHash(contractId)
  },
  '/v1/eventsSince': function ({contractId, since}) {
    return backend.eventsSince(contractId, since)
  }
}

sbp.registerDomain('backend', api)
export default backend
