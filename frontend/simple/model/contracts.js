import sbp from '../../../shared/sbp.js'
import { GIMessage } from '../../../shared/GIMessage.js'
import GroupContract from './contracts/group.js'
import IdentityContract from './contracts/identity.js'
import MailboxContract from './contracts/mailbox.js'

const contracts: Object = {
  ...GroupContract,
  ...IdentityContract,
  ...MailboxContract
}

sbp('sbp/selectors/register', {
  'gi/contract/create': function (name, data) {
    contracts[name].validate(data)
    return GIMessage.create(null, null, undefined, name, data)
  },
  'gi/contract/create-action': async function (name, data, contractID) {
    contracts[name].validate(data)
    const previousHEAD = await sbp('backend/latestHash', contractID)
    return GIMessage.create(contractID, previousHEAD, undefined, name, data)
  }
})

export default contracts
