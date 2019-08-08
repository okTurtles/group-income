import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'
import GroupContract, { metadata } from './contracts/group.js'
import IdentityContract from './contracts/identity.js'
import MailboxContract from './contracts/mailbox.js'

const contracts: Object = {
  ...GroupContract,
  ...IdentityContract,
  ...MailboxContract
}

// TODO:
//      1. move constants defined in contracts to exported constants
//      2. delete this file

sbp('sbp/selectors/register', {
  'gi.message/create/contract': function (name, data) {
    contracts[name].validate(data)
    var meta = name.indexOf('Group') === 0 ? metadata() : {}
    return GIMessage.create(null, null, undefined, name, data, meta)
  },
  'gi.message/create/action': async function (name, data, contractID) {
    contracts[name].validate(data)
    const previousHEAD = await sbp('backend/latestHash', contractID)
    var meta = name.indexOf('Group') === 0 ? metadata() : {}
    return GIMessage.create(contractID, previousHEAD, undefined, name, data, meta)
  },
  'gi.message/process': function () {
  }
})

export default contracts
