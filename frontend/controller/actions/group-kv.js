'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS, LAST_LOGGED_IN_THROTTLE_WINDOW } from '~/frontend/utils/constants.js'
import { KV_QUEUE, NEW_LAST_LOGGED_IN, ONLINE, KV_LOAD_STATUS } from '~/frontend/utils/events.js'

sbp('okTurtles.events/on', ONLINE, () => {
  if (!sbp('state/vuex/state').loggedIn?.identityContractID) {
    return
  }
  sbp('gi.actions/group/kv/load').catch(e => {
    console.error("Error from 'gi.actions/group/kv/load' after reestablished connection:", e)
  })
})

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/kv/load': async () => {
    console.info('loading data from group key-value store...')
    sbp('okTurtles.events/emit', KV_LOAD_STATUS, { name: 'group', status: 'loading' })

    const cheloniaState = await sbp('chelonia/rootState')
    const identityContractID = cheloniaState.loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to fetch group data without an active session')
    }
    await Promise.all(
      Object.entries(cheloniaState[identityContractID].groups || {}).map(([contractID, state]) => {
        // $FlowFixMe[incompatible-type]
        if (state.hasLeft) return undefined
        return sbp('chelonia/queueInvocation', contractID, ['gi.actions/group/kv/loadLastLoggedIn', { contractID }])
      })
    )

    console.info('group key-value store data loaded!')
    sbp('okTurtles.events/emit', KV_LOAD_STATUS, { name: 'group', status: 'loaded' })
  },
  'gi.actions/group/kv/fetchLastLoggedIn': async ({ contractID }: { contractID: string }) => {
    const kvData = await sbp('chelonia/kv/get', contractID, KV_KEYS.LAST_LOGGED_IN)
    // kvData could be falsy if the server returns 404
    if (kvData) {
      // Note: this could throw an exception if there's a signature or decryption
      // issue
      return kvData.data
    }
    return Object.create(null)
  },
  'gi.actions/group/kv/loadLastLoggedIn': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const data = await sbp('gi.actions/group/kv/fetchLastLoggedIn', { contractID })
      sbp('okTurtles.events/emit', NEW_LAST_LOGGED_IN, [contractID, data])
    }).catch(e => {
      console.error('[gi.actions/group/kv/loadLastLoggedIn] Error loading last logged in', e)
    })
  },
  'gi.actions/group/kv/updateLastLoggedIn': ({ contractID, throttle }: { contractID: string, throttle: boolean }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update lastLoggedIn without an active session')
    }

    const now = sbp('chelonia/time')
    if (throttle) {
      const state = sbp('state/vuex/state')
      const lastLoggedInRawValue: ?string = state.lastLoggedIn?.[contractID]?.[identityContractID]
      if (lastLoggedInRawValue) {
        const lastLoggedIn = new Date(lastLoggedInRawValue).getTime()

        if ((now - lastLoggedIn) < LAST_LOGGED_IN_THROTTLE_WINDOW) return
      }
    }

    const nowString = new Date(now).toISOString()
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const constructUpdatedLastLoggedIn = ({ etag, currentData = {} } = {}) => {
        return [{ ...currentData, [identityContractID]: nowString }, etag]
      }

      const data = constructUpdatedLastLoggedIn()[0]
      await sbp('chelonia/kv/set', contractID, KV_KEYS.LAST_LOGGED_IN, data, {
        encryptionKeyId: await sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek'),
        signingKeyId: await sbp('chelonia/contract/currentKeyIdByName', contractID, 'csk'),
        onconflict: constructUpdatedLastLoggedIn
      })
    })
  }
}): string[])
