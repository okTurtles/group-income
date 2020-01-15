import sbp from '~/shared/sbp.js'

// TODO - reuse this to handle other GI specific errors
class ErrorCaused extends Error {
  constructor (cause, ...args) {
    super(...args)
    this.cause = args.cause || cause
    Error.captureStackTrace(this, ErrorCaused)
  }
}

export default async function login ({
  username,
  password // TODO - implement password
}) {
  // TODO: Insert cryptography here
  const identityContractID = await sbp('namespace/lookup', username)
  console.log('ora bem', identityContractID)
  if (!identityContractID) {
    throw new ErrorCaused('INVALID_MATCH')
  }

  try {
    console.debug(`Retrieved identity ${identityContractID}`)
    await sbp('state/vuex/dispatch', 'login', { username, identityContractID })

    return true
  } catch (e) {
    throw Error(e)
  }
};
