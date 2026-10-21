'use strict'

export const isUnsentMessage = (message: Record<string, any>): boolean =>
  !!message.hasFailed || !!message.pending

const heightRank = (message: Record<string, any>): number =>
  Number.isFinite(message.height) ? message.height : Infinity

export const sortMessages = (messages: Array<Record<string, any>>): Array<Record<string, any>> => {
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
