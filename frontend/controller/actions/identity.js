import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L, { LError } from '@view-utils/translations.js'
import { imageUpload } from '@utils/image.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/create': async function ({
    username,
    email,
    password,
    picture
  }) { // TODO: 'sync' should be done in here, not in signup, to
    //          keep it consistent with how group.js works
    // TODO: make sure we namespace these names:
    //       https://github.com/okTurtles/group-income-simple/issues/598
    const oldSettings = await sbp('gi.db/settings/load', username)
    if (oldSettings) {
      // TODO: prompt to ask user before deleting and overwriting an existing user
      //       https://github.com/okTurtles/group-income-simple/issues/599
      console.warn(`deleting settings for pre-existing identity ${username}!`, oldSettings)
      await sbp('gi.db/settings/delete', username)
    }

    let finalPicture = `${window.location.origin}/assets/images/user-avatar-default.png`

    if (picture) {
      try {
        finalPicture = await imageUpload(picture)
      } catch (e) {
        console.error('actions/identity.js picture upload error:', e)
        throw new GIErrorUIRuntimeError(L('Failed to upload the profile picture. {codeError}', { codeError: e.message }))
      }
    }
    // proceed with creation
    const user = await sbp('gi.contracts/identity/create', {
      // authorizations: [Events.CanModifyAuths.dummyAuth()],
      attributes: {
        username,
        email: email,
        picture: finalPicture
      }
    })
    const mailbox = await sbp('gi.contracts/mailbox/create', {
      // authorizations: [Events.CanModifyAuths.dummyAuth(user.contractID())]
    })
    await sbp('backend/publishLogEntry', user)
    await sbp('backend/publishLogEntry', mailbox)

    const userID = user.contractID()
    const mailboxID = mailbox.contractID()

    // set the attribute *after* publishing the identity contract
    const attribute = await sbp('gi.contracts/identity/setAttributes/create',
      { mailbox: mailboxID },
      userID
    )
    await sbp('backend/publishLogEntry', attribute)

    return [userID, mailboxID]
  },
  'gi.actions/identity/signup': async function ({
    username,
    email,
    password // TODO - implement
  }, {
    sync = true
  } = {}) {
    try {
      const randomAvatar = sbp('gi.utils/avatar/create')
      const [userID, mailboxID] = await sbp('gi.actions/identity/create', {
        username,
        email,
        password,
        picture: randomAvatar
      })

      await sbp('namespace/register', username, userID)

      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', [userID, mailboxID])
      }
      return [userID, mailboxID]
    } catch (e) {
      await sbp('gi.actions/identity/logout') // TODO: should this be here?
      console.error('gi.actions/identity/signup failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to signup: {reportError}', LError(e)))
    }
  },
  'gi.actions/identity/login': async function ({
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
      // TODO: move the login vuex action code into this function (see #804)
      await sbp('state/vuex/dispatch', 'login', { username, identityContractID: userId })

      if (sync) {
        await sbp('gi.actions/contract/syncAndWait', userId)
      }

      return userId
    } catch (e) {
      console.error('gi.actions/identity/login failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to login: {reportError}', LError(e)))
    }
  },
  'gi.actions/identity/signupAndLogin': async function (signupParams) {
    const contractIDs = await sbp('gi.actions/identity/signup', signupParams, { sync: true })
    await sbp('gi.actions/identity/login', signupParams, { sync: true })
    return contractIDs
  },
  'gi.actions/identity/logout': async function () {
    // TODO: move the logout vuex action code into this function (see #804)
    await sbp('state/vuex/dispatch', 'logout')
  },
  'gi.actions/identity/updateSettings': async function (settings, contractID) {
    const msg = await sbp('gi.contracts/identity/updateSettings/create', settings, contractID)
    await sbp('backend/publishLogEntry', msg)
  }
}): string[])
