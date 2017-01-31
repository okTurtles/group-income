'use strict'

import Primus from '../assets/vendor/primus'
import {RESPONSE_TYPE} from '../../../shared/constants'
const {ERROR} = RESPONSE_TYPE

export const primus = new Primus(
  process.env.API_URL,
  {
    // TODO: are these right? need to brainstorm situations and verify.
    timeout: 3000,
    strategy: ['disconnect', 'online', 'timeout']
  }
)
export default function (store: Object) {
  primus.on('error', err => console.log('SOCKET ERR:', err.message))
  primus.on('open', () => console.log('websocket connection opened!'))
  primus.on('data', msg => {
    if (msg.type === RESPONSE_TYPE.ENTRY) {
      console.log('SOCKET GOT NEW LOG ENTRY:', msg)
      if (!msg.data) throw Error('malformed message: ' + JSON.stringify(msg))
      store.dispatch('handleEvent', msg.data)
    } else {
      // TODO: this!!
      console.log('SOCKET UNHANDLED EVENT!', msg)
    }
  })
}

export function joinRoom (groupId: string) {
  return new Promise((resolve, reject) => {
    primus.writeAndWait({action: 'sub', groupId}, function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}

export function leaveRoom (groupId: string) {
  return new Promise((resolve, reject) => {
    primus.writeAndWait({action: 'unsub', groupId}, function (response) {
      (response.type === ERROR ? reject : resolve)(response)
    })
  })
}
