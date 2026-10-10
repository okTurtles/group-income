export const randomUserSuffix = () => {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0')
}

export const currentKeyByName = (state, name) => Object.values(state?._vm?.authorizedKeys || {})
  .find((key) => key.name === name && key._notAfterHeight == null)

// Reads a chatroom that we're not subscribed to (e.g., after leaving it)
export const readChatRoom = async (sbp, chatRoomID, readFn) => {
  await sbp('chelonia/contract/retain', chatRoomID, { ephemeral: true })
  try {
    await sbp('chelonia/contract/sync', chatRoomID)
    return await readFn(await sbp('chelonia/contract/state', chatRoomID))
  } finally {
    await sbp('chelonia/contract/release', chatRoomID, { ephemeral: true })
  }
}
