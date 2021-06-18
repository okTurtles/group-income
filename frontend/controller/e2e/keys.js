/* eslint-disable */

'use strict'

import sbp from '~/shared/sbp.js'
import { blake32Hash, bytesToB64 } from '~/shared/functions.js'
import nacl from 'tweetnacl'
import scrypt from 'scrypt-async'

import type { GIKey, GIKeyType } from '~/shared/domains/chelonia/GIMessage.js'

function genSeed (): string {
  return bytesToB64(nacl.randomBytes(nacl.box.secretKeyLength))
}

function genDeviceSecretFromSeed (
  { seed, scope, devIdx }: {
    seed: string,
    scope: string,
    devIdx: number
  }
): string {
  return blake32Hash(`${seed}group_income${scope}d${devIdx}`)
}

function deviceObjToContextStr (
  dev: Object
): string {
  // TODO: figure out the description
  return `scope:${dev.scope},devType:${dev.devType},description:<encrypted description>,devIdx:${dev.devIdx},status:${dev.status}`
}

function contextStrToDeviceObj (
  str: string
): Object {
  return str.split(',')
}

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
      description, status, devIdx, devType
    }
  }
})
