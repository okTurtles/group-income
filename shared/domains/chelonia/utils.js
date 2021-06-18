'use strict'

import { GIMessage } from './GIMessage.js'

export function sanityCheck (msg: GIMessage) {
  const [type] = msg.message().op
  switch (type) {
    case GIMessage.OP_CONTRACT:
      if (!msg.isFirstMessage()) throw new Error('OP_CONTRACT: must be first message')
      break
    case GIMessage.OP_ACTION_ENCRYPTED:
      // nothing for now
      break
    default:
      throw new Error(`unsupported op: ${type}`)
  }
}
