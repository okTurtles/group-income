'use strict'

import sbp from '@sbp/sbp'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L, { LError } from '@view-utils/translations.js'
import { imageUpload } from '@utils/image.js'
import { captureLogsStart, captureLogsPause } from '~/frontend/model/captureLogs.js'
import { SETTING_CURRENT_USER } from '~/frontend/model/database.js'
import { LOGIN, LOGOUT } from '~/frontend/utils/events.js'
import './mailbox.js'

import { encryptedAction } from './utils.js'

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
  'gi.actions/identity/login': async function ({ username, password }: {
    username: string, password?: string
  }) {
    // TODO: Insert cryptography here
    const identityContractID = await sbp('namespace/lookup', username)
    if (!identityContractID) {
      throw new GIErrorUIRuntimeError(L('Invalid username or password'))
    }
    try {
      captureLogsStart(username)
      const state = await sbp('gi.db/settings/load', username)
      // login can be called when no settings are saved (e.g. from Signup.vue)
      if (state) {
        // The retrieved local data might need to be completed in case it was originally saved
        // under an older version of the app where fewer/other Vuex modules were implemented.
        sbp('state/vuex/postUpgradeVerification', state)
        sbp('state/vuex/replace', state)
        sbp('chelonia/pubsub/update') // resubscribe to contracts since we replaced the state
        const contractIDs = Object.keys(state.contracts)
        // in some weird circumstances in the past these were set but state.contracts
        // didn't have them. so just to be safe we add them again here
        if (state.currentGroupId && !contractIDs.includes(state.currentGroupId)) {
          contractIDs.push(state.currentGroupId)
        }
        if (!contractIDs.includes(identityContractID)) {
          contractIDs.push(identityContractID)
        }
        // IMPORTANT: we avoid using 'await' on the syncs so that Vue.js can proceed
        //            loading the website instead of stalling out.
        sbp('chelonia/contract/sync', contractIDs).then(function () {
          console.warn('unimplemented. TODO: setLoginState here')
        })
      }
      await sbp('gi.db/settings/save', SETTING_CURRENT_USER, username)
      sbp('state/vuex/commit', 'login', { username, identityContractID })
      // Vue.nextTick(() => sbp('okTurtles.events/emit', EVENTS.LOGIN, user))
      sbp('okTurtles.events/emit', LOGIN, { username, identityContractID })
      return identityContractID
    } catch (e) {
      console.error('gi.actions/identity/login failed!', e)
      throw new GIErrorUIRuntimeError(L('Failed to login: {reportError}', LError(e)))
    }
  },
  'gi.actions/identity/signupAndLogin': async function ({ username, email, password }) {
    const contractIDs = await sbp('gi.actions/identity/signup', { username, email, password })
    await sbp('gi.actions/identity/login', { username, password })
    return contractIDs
  },
  'gi.actions/identity/logout': async function () {
    const state = sbp('state/vuex/state')
    await sbp('state/vuex/save')
    await sbp('gi.db/settings/save', SETTING_CURRENT_USER, null)
    await sbp('chelonia/contract/remove', Object.keys(state.contracts))
    sbp('state/vuex/commit', 'logout')
    sbp('okTurtles.events/emit', LOGOUT)
    captureLogsPause({
      // Let's clear all stored logs to prevent someone else
      // accessing sensitve data after the user logs out.
      wipeOut: true
    })
  },
  ...encryptedAction('gi.actions/identity/setAttributes', L('Failed to set profile attributes.')),
  ...encryptedAction('gi.actions/identity/updateSettings', L('Failed to update profile settings.')),
  ...encryptedAction('gi.contracts/identity/setLoginState', L('Failed to set login state.'))
}): string[])
