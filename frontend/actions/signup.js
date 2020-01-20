import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L from '@view-utils/translations.js'

export default async function signup ({
  username,
  email,
  password // TODO - implement
}, callback) {
  try {
    // TODO: make sure we namespace these names:
    //       https://github.com/okTurtles/group-income-simple/issues/598
    const oldSettings = await sbp('gi.db/settings/load', username)
    if (oldSettings) {
      // TODO: prompt to ask user before deleting and overwriting an existing user
      //       https://github.com/okTurtles/group-income-simple/issues/599
      console.warn(`deleting settings for pre-existing user ${username}!`, oldSettings)
      await sbp('gi.db/settings/delete', username)
    }
    // proceed with creation
    const user = sbp('gi.contracts/identity/create', {
      // authorizations: [Events.CanModifyAuths.dummyAuth()],
      attributes: {
        name: username,
        email: email,
        picture: `${window.location.origin}/assets/images/default-avatar.png`
      }
    })
    const mailbox = sbp('gi.contracts/mailbox/create', {
      // authorizations: [Events.CanModifyAuths.dummyAuth(user.hash())]
    })
    await sbp('backend/publishLogEntry', user)
    await sbp('backend/publishLogEntry', mailbox)

    // set the attribute *after* publishing the identity contract
    const attribute = await sbp('gi.contracts/identity/setAttributes/create',
      { mailbox: mailbox.hash() },
      user.hash()
    )
    await sbp('backend/publishLogEntry', attribute)
    // register our username if contract creation worked out
    await sbp('namespace/register', username, user.hash())
    // call syncContractWithServer on all of these contracts to:
    // 1. begin monitoring the contracts for updates via the pubsub system
    // 2. add these contracts to our vuex state
    for (const contract of [user, mailbox]) {
      await sbp('state/enqueueContractSync', contract.hash())
    }
    // TODO: Just add cryptographic magic
    // login also calls 'state/enqueueContractSync', but not in this case since we
    // just sync'd it.
    await sbp('state/vuex/dispatch', 'login', {
      username,
      identityContractID: user.hash()
    })

    return true
  } catch (e) {
    sbp('state/vuex/dispatch', 'logout')
    throw new GIErrorUIRuntimeError(L('Failed to signup: {codeError}', { codeError: e.message }))
  }
}
