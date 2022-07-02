'use strict'

import sbp from '@sbp/sbp'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L, { LError } from '@view-utils/translations.js'
import { imageUpload } from '@utils/image.js'
import { pickWhere, difference } from '@utils/giLodash.js'
import { SETTING_CURRENT_USER } from '~/frontend/model/database.js'
import { LOGIN, LOGOUT } from '~/frontend/utils/events.js'
import './mailbox.js'

import { encryptedAction } from './utils.js'

function generatedLoginState () {
  const { contracts } = sbp('state/vuex/state')
  return {
    groupIds: Object.keys(pickWhere(contracts, ({ type }) => {
      return type === 'gi.contracts/group'
    }))
  }
}

function diffLoginStates (s1: ?Object, s2: ?Object) {
  if (typeof s1 !== 'object' || typeof s2 !== 'object') return true
  const [g1, g2] = [(s1: Object).groupIds, (s2: Object).groupIds]
  if (!g1 || !g2) return true
  return (g1.length > g2.length ? difference(g1, g2) : difference(g2, g1)).length > 0
}

export default (sbp('sbp/selectors/register', {
  'gi.actions/identity/create': async function ({
    data: { username, email, password, picture },
    publishOptions
  }) {
    // TODO: make sure we namespace these names:
    //       https://github.com/okTurtles/group-income/issues/598
    const oldSettings = await sbp('gi.db/settings/load', username)
    if (oldSettings) {
      // TODO: prompt to ask user before deleting and overwriting an existing user
      //       https://github.com/okTurtles/group-income/issues/599
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
    // first create the mailbox for the user and subscribe to it
    // and do this outside of a try block so that if it throws the error just gets passed up
    const mailbox = await sbp('gi.actions/mailbox/create', { options: { sync: true } })
    const mailboxID = mailbox.contractID()
    let userID
    // next create the identity contract itself and associate it with the mailbox
    try {
      const user = await sbp('chelonia/out/registerContract', {
        contractName: 'gi.contracts/identity',
        publishOptions,
        data: {
          attributes: { username, email, picture: finalPicture }
        }
      })
      userID = user.contractID()
      await sbp('chelonia/contract/sync', userID)
      await sbp('gi.actions/identity/setAttributes', {
        contractID: userID, data: { mailbox: mailboxID }
      })
    } catch (e) {
      console.error('gi.actions/identity/create failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to create user identity: {reportError}', LError(e)))
    }
    return [userID, mailboxID]
  },
  'gi.actions/identity/signup': async function ({ username, email, password }, publishOptions) {
    try {
      const randomAvatar = sbp('gi.utils/avatar/create')
      const [userID, mailboxID] = await sbp('gi.actions/identity/create', {
        data: {
          username,
          email,
          password,
          picture: randomAvatar
        },
        publishOptions
      })
      await sbp('namespace/register', username, userID)
      return [userID, mailboxID]
    } catch (e) {
      await sbp('gi.actions/identity/logout') // TODO: should this be here?
      console.error('gi.actions/identity/signup failed!', e)
      const message = LError(e)
      if (e.name === 'GIErrorUIRuntimeError') {
        // 'gi.actions/identity/create' also sets reportError
        message.reportError = e.message
      }
      throw new GIErrorUIRuntimeError(L('Failed to signup: {reportError}', message))
    }
  },
  'gi.actions/identity/saveOurLoginState': function () {
    const getters = sbp('state/vuex/getters')
    const contractID = getters.ourIdentityContractId
    const ourLoginState = generatedLoginState()
    const contractLoginState = getters.loginState
    if (contractID && diffLoginStates(ourLoginState, contractLoginState)) {
      return sbp('gi.contracts/identity/setLoginState', {
        contractID, data: ourLoginState
      })
    }
  },
  'gi.actions/identity/updateLoginStateUponLogin': async function () {
    const getters = sbp('state/vuex/getters')
    const state = sbp('state/vuex/state')
    const ourLoginState = generatedLoginState()
    const contractLoginState = getters.loginState
    try {
      if (!contractLoginState) {
        console.info('no login state detected in identity contract, will set it')
        await sbp('gi.actions/identity/saveOurLoginState')
      } else if (diffLoginStates(ourLoginState, contractLoginState)) {
        // we need to update ourselves to it
        // mainly we are only interested if the contractLoginState contains groupIds
        // that we don't have, and if so, join those groups
        const groupsJoined = difference(contractLoginState.groupIds, ourLoginState.groupIds)
        console.info('synchronizing login state:', { groupsJoined })
        for (const contractID of groupsJoined) {
          try {
            await sbp('gi.actions/group/join', { contractID, options: { skipInviteAccept: true } })
          } catch (e) {
            console.error(`updateLoginStateUponLogin: ${e.name} attempting to join group ${contractID}`, e)
            if (state.contracts[contractID] || state[contractID]) {
              console.warn(`updateLoginStateUponLogin: removing ${contractID} b/c of failed join`)
              try {
                await sbp('chelonia/contract/remove', contractID)
              } catch (e2) {
                console.error(`failed to remove ${contractID} too!`, e2)
              }
            }
          }
        }
      }
      // note: leaving groups will happen when we sync the removeOurselves message
      if (!state.currentGroupId) {
        const { contracts } = state
        const gId = Object.keys(contracts).find(cID => contracts[cID].type === 'gi.contracts/group')
        if (gId) {
          sbp('gi.actions/group/switch', gId)
          const router = sbp('controller/router')
          // redirect us to the dashboard upon login if there's nothing else going on, no modals up, etc.
          // only update the URL if it's empty and we're stuck at the homepage, as can sometimes happen
          if (router.currentRoute.path === '/' && Object.keys(router.currentRoute.query).length === 0) {
            router.push({ path: '/dashboard' }).catch(console.warn)
          }
        }
      }
    } catch (e) {
      console.error(`updateLoginState: ${e.name}: '${e.message}'`, e)
    }
  },
  'gi.actions/identity/login': async function ({ username, password }: {
    username: string, password?: string
  }) {
    // TODO: Insert cryptography here
    const identityContractID = await sbp('namespace/lookup', username)
    if (!identityContractID) {
      throw new GIErrorUIRuntimeError(L('Invalid username or password'))
    }
    try {
      sbp('appLogs/startCapture', username)
      const state = await sbp('gi.db/settings/load', username)
      let contractIDs = []
      // login can be called when no settings are saved (e.g. from Signup.vue)
      if (state) {
        // The retrieved local data might need to be completed in case it was originally saved
        // under an older version of the app where fewer/other Vuex modules were implemented.
        sbp('state/vuex/postUpgradeVerification', state)
        sbp('state/vuex/replace', state)
        sbp('chelonia/pubsub/update') // resubscribe to contracts since we replaced the state
        contractIDs = Object.keys(state.contracts)
      }
      if (!contractIDs.includes(identityContractID)) {
        contractIDs.push(identityContractID)
      }
      await sbp('gi.db/settings/save', SETTING_CURRENT_USER, username)
      sbp('state/vuex/commit', 'login', { username, identityContractID })
      // IMPORTANT: we avoid using 'await' on the syncs so that Vue.js can proceed
      //            loading the website instead of stalling out.
      sbp('chelonia/contract/sync', contractIDs).then(async function () {
        // contract sync might've triggered an async call to /remove, so wait before proceeding
        await sbp('chelonia/contract/wait', contractIDs)
        // similarly, since removeMember may have triggered saveOurLoginState asynchronously,
        // we must re-sync our identity contract again to ensure we don't rejoin a group we
        // were just kicked out of
        await sbp('chelonia/contract/sync', identityContractID)
        await sbp('gi.actions/identity/updateLoginStateUponLogin')
        await sbp('gi.actions/identity/saveOurLoginState') // will only update it if it's different
        sbp('okTurtles.events/emit', LOGIN, { username, identityContractID })
      }).catch((err) => {
        const errMsg = L('Error during login contract sync: {err}', { err: err.message })
        console.error(errMsg, err)
        alert(errMsg)
      })
      return identityContractID
    } catch (e) {
      console.error('gi.actions/identity/login failed!', e)
      const humanErr = L('Failed to login: {reportError}', LError(e))
      alert(humanErr)
      sbp('gi.actions/identity/logout')
      throw new GIErrorUIRuntimeError(humanErr)
    }
  },
  'gi.actions/identity/signupAndLogin': async function ({ username, email, password }) {
    const contractIDs = await sbp('gi.actions/identity/signup', { username, email, password })
    await sbp('gi.actions/identity/login', { username, password })
    return contractIDs
  },
  'gi.actions/identity/logout': async function () {
    const state = sbp('state/vuex/state')
    try {
      // wait for any pending sync operations to finish before saving
      console.info('logging out, waiting for any events to finish...')
      await sbp('chelonia/contract/wait')
      await sbp('state/vuex/save')
      await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
      await sbp('chelonia/contract/remove', Object.keys(state.contracts))
      console.info('successfully logged out')
    } catch (e) {
      console.error(`${e.name} during logout: ${e.message}`, e)
    }
    sbp('state/vuex/commit', 'logout')
    sbp('okTurtles.events/emit', LOGOUT)
    sbp('appLogs/pauseCapture', { wipeOut: true }) // clear stored logs to prevent someone else accessing sensitve data
  },
  ...encryptedAction('gi.actions/identity/setAttributes', L('Failed to set profile attributes.')),
  ...encryptedAction('gi.actions/identity/updateSettings', L('Failed to update profile settings.')),
  ...encryptedAction('gi.contracts/identity/setLoginState', L('Failed to set login state.'))
}): string[])
