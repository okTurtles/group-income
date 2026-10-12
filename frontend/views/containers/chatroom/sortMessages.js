'use strict'

export const isUnsentMessage = (message: Object): boolean =>
  !!message.hasFailed || (!!message.pending && !message.pendingEdit)

const heightRank = (message: Object): number =>
  Number.isFinite(message.height) ? message.height : Infinity

export const sortMessages = (messages: Array<Object>): Array<Object> => {
  const sent = []
  const unsent = []
  for (const message of messages) {
    if (isUnsentMessage(message)) {
      unsent.push(message)
    } else {
      sent.push(message)
    }
  }
  sent.sort((a, b) => {
    const rankA = heightRank(a)
    const rankB = heightRank(b)
    return rankA === rankB ? 0 : rankA - rankB
  })
  return sent.concat(unsent)
}
