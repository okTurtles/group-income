import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L from '@view-utils/translations.js'

// import { CONTRACT_IS_SYNCING } from '@utils/events.js'

export default sbp('sbp/selectors/register', {
  'gi.actions/user/create': async function ({
    username,
    email,
    password
  }) {
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

    return [user.hash(), mailbox.hash()]
  },
  'gi.actions/user/signup': async function ({
    username,
    email,
    password // TODO - implement
  }, {
    sync = true
  } = {}) {
    try {
      const [userID, mailboxID] = await sbp('gi.actions/user/create', { username, email, password })

      // set the attribute *after* publishing the identity contract
      const attribute = await sbp('gi.contracts/identity/setAttributes/create',
        { mailbox: mailboxID },
        userID
      )
      await sbp('backend/publishLogEntry', attribute)
      await sbp('namespace/register', username, userID)

      const contracts = [userID, mailboxID]

      if (!sync) { return contracts }
      await sbp('gi.actions/contract/syncAndWait', contracts)
      return contracts
    } catch (e) {
      await sbp('gi.actions/user/logout') // TODO: should this be here?
      console.error('gi.actions/user/signup failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to signup: {codeError}', { codeError: e.message }))
    }
  },
  'gi.actions/user/login': async function ({
    username,
    password
  }, {
    sync = true
  } = {}) {
    // TODO: Insert cryptography here
    const userId = await sbp('namespace/lookup', username)
    if (!userId) {
      throw new GIErrorUIRuntimeError(L('Invalid username or password'))
    }

    try {
      console.debug(`Retrieved identity ${userId}`)
      await sbp('state/vuex/dispatch', 'login', { username, identityContractID: userId })

      if (!sync) { return userId }

      await sbp('gi.actions/contract/syncAndWait', userId)
      return userId
    } catch (e) {
      console.error('gi.actions/user/login failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to login: {codeError}', { codeError: e.message }))
    }
  },
  'gi.actions/user/signupAndLogin': async function (signupParams) {
    const [userId, mailboxId] = await sbp('gi.actions/user/signup', signupParams)
    await sbp('gi.actions/user/login', signupParams)
    return [userId, mailboxId]
  },

  'gi.actions/user/logout': async function () {
    await sbp('state/vuex/dispatch', 'logout')
  }
})
