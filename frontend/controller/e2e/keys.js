/* eslint-disable */

'use strict'

import sbp from '@sbp/sbp'
import { blake32Hash, bytesToB64 } from '~/shared/functions.ts'
import nacl from 'tweetnacl'
import scrypt from 'scrypt-async'

import type { GIKey, GIKeyType } from '~/shared/domains/chelonia/types.flow.js'

function genSeed (): string {
  return bytesToB64(nacl.randomBytes(nacl.box.secretKeyLength))
}

function genDeviceSecretFromSeed (
  { seed, scope, deviceIdx }: {
    seed: string,
    scope: string,
    deviceIdx: number
  }
): string {
  return blake32Hash(`${seed}group_income${scope}d${deviceIdx}`)
}

function deviceObjToContextStr (
  dev: Object
): string {
  // TODO: figure out the description
  return `scope:${dev.scope},devType:${dev.devType},description:<encrypted description>,deviceIdx:${dev.deviceIdx},status:${dev.status}`
}

function contextStrToDeviceObj (
  str: string
): Object {
  return str.split(',')
}

// $FlowFixMe
export default sbp('sbp/selectors/register', {
  'gi.e2e/keys/keypair/create': function (
    { type = '' }: {
      type: GIKeyType
    }) {

  },
  'gi.e2e/keys/keyset/create': function (
    { devType }: {
      devType: 'primary' | 'secondary'
    }) {
    const defaultKeypair = sbp('gi.e2e/keys/keypair/create', {
      scope: 'default'
    })
    const adminKeypair = sbp('gi.e2e/keys/keypair/create', {
      scope: 'admin'
    })
    return {
      // $FlowFixMe
      description, status, deviceIdx, devType
    }
  }
})
