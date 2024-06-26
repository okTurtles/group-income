'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { KV_QUEUE } from '~/frontend/utils/events.js'

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/kv/updateLastLoggedIn': async ({ contractID }: { contractID: string }) => {
    const { ourIdentityContractId } = sbp('state/vuex/getters')
    if (!ourIdentityContractId) {
      throw new Error('Unable to update lastLoggedIn without an active session')
    }

    // Wait for any pending operations (e.g., sync) to finish
    await sbp('chelonia/queueInvocation', contractID, () => {})

    const now = new Date().toISOString()
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedLastLoggedIn = async (cID, key) => {
        const current = (await sbp('chelonia/kv/get', cID, key))?.data || {}
        return { ...current, [ourIdentityContractId]: now }
      }

      const data = await getUpdatedLastLoggedIn(contractID, KV_KEYS.LAST_LOGGED_IN)
      await sbp('chelonia/kv/set', contractID, KV_KEYS.LAST_LOGGED_IN, data, {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek'),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, 'csk'),
        onconflict: getUpdatedLastLoggedIn
      })
    })
  }
}): string[])
