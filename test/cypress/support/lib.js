export const randomUserSuffix = () => {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0')
}

export const currentKeyByName = (state, name) => Object.values(state?._vm?.authorizedKeys || {})
  .find((key) => key.name === name && key._notAfterHeight == null)

// Key requests that `requesterID` sent to a contract and that haven't been
// answered. Entries of Chelonia's `pendingKeyshares` are
// [encrypted, height, signingKeyId, context, request, ...], `context[0]` being
// the contract of whoever sent the request.
export const pendingKeyRequestsFrom = (state, requesterID) => Object.values(state?._vm?.pendingKeyshares || {})
  .filter((entry) => Array.isArray(entry) && entry[3]?.[0] === requesterID)

// Reads the latest state of a chatroom, whether or not we're subscribed to it
// (e.g., after leaving it)
export const readChatRoom = async (sbp, chatRoomID, readFn) => {
  await sbp('chelonia/contract/retain', chatRoomID, { ephemeral: true })
  try {
    await sbp('chelonia/contract/sync', chatRoomID)
    return await readFn(await sbp('chelonia/contract/state', chatRoomID))
  } finally {
    await sbp('chelonia/contract/release', chatRoomID, { ephemeral: true })
      .catch((e) => console.warn('[readChatRoom] Error releasing', chatRoomID, e))
  }
}
