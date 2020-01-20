import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L from '@view-utils/translations.js'

// import { CONTRACT_IS_SYNCING } from '@utils/events.js'

export default sbp('sbp/selectors/register', {
  'gi.actions/user/create': async function () {
    // Is it here we do the signup? Shouldn't this be called user/signup for consistency?
    // TODO - if yes, rename '/user/signup' to '/user/create'.
  },
  // REVIEW these 2, same question as in group.js
  'gi.actions/user/createAndSubscribe': async function () {},
  'gi.actions/user/createAndSubscribeWait': async function () {},

  'gi.actions/user/signup': async function ({
    username,
    email,
    password // TODO - implement
  }) {
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

      const userHash = user.hash()
      // set the attribute *after* publishing the identity contract
      const attribute = await sbp('gi.contracts/identity/setAttributes/create',
        { mailbox: mailbox.hash() },
        userHash
      )
      await sbp('backend/publishLogEntry', attribute)
      // register our username if contract creation worked out
      await sbp('namespace/register', username, userHash)
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
        identityContractID: userHash
      })

      return userHash
    } catch (e) {
      sbp('gi.actions/user/logout')
      throw new GIErrorUIRuntimeError(L('Failed to signup: {codeError}', { codeError: e.message }))
    }
  },

  'gi.actions/user/login': async function ({
    username,
    password // TODO - implement password
  }) {
    // TODO: Insert cryptography here
    const identityContractID = await sbp('namespace/lookup', username)
    if (!identityContractID) {
      throw new GIErrorUIRuntimeError(L('Invalid username or password'))
    }

    try {
      console.debug(`Retrieved identity ${identityContractID}`)
      await sbp('state/vuex/dispatch', 'login', { username, identityContractID })

      return identityContractID
    } catch (e) {
      throw new GIErrorUIRuntimeError(L('Failed to login: {codeError}', { codeError: e.message }))
    }
  },

  'gi.actions/user/logout': async function () {
    await sbp('state/vuex/dispatch', 'logout')
  }
})
