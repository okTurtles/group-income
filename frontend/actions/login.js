import sbp from '~/shared/sbp.js'
import { GIErrorUIRuntimeError } from '@model/errors.js'
import L from '@view-utils/translations.js'

export default async function login ({
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

    return true
  } catch (e) {
    throw new GIErrorUIRuntimeError(L('Failed to login: {codeError}', { codeError: e.message }))
  }
};
