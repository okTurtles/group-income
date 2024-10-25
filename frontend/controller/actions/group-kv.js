'use strict'
import sbp from '@sbp/sbp'
import { KV_KEYS, LAST_LOGGED_IN_THROTTLE_WINDOW } from '~/frontend/utils/constants.js'
import { KV_QUEUE, NEW_LAST_LOGGED_IN, ONLINE } from '~/frontend/utils/events.js'

sbp('okTurtles.events/on', ONLINE, () => {
  sbp('gi.actions/group/kv/load').catch(e => {
    console.error("Error from 'gi.actions/identity/kv/load' after reestablished connection:", e)
  })
})

export default (sbp('sbp/selectors/register', {
  'gi.actions/group/kv/load': async () => {
    console.info('loading data from group key-value store...')
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
  },
  'gi.actions/group/kv/fetchLastLoggedIn': async ({ contractID }: { contractID: string }) => {
    return (await sbp('chelonia/kv/get', contractID, KV_KEYS.LAST_LOGGED_IN).catch((e) => {
      console.error('[gi.actions/group/kv/fetchLastLoggedIn] Error', e)
    }))?.data || Object.create(null)
  },
  'gi.actions/group/kv/loadLastLoggedIn': ({ contractID }: { contractID: string }) => {
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const data = await sbp('gi.actions/group/kv/fetchLastLoggedIn', { contractID })
      sbp('okTurtles.events/emit', NEW_LAST_LOGGED_IN, [contractID, data])
    })
  },
  'gi.actions/group/kv/updateLastLoggedIn': ({ contractID, throttle }: { contractID: string, throttle: boolean }) => {
    const identityContractID = sbp('state/vuex/state').loggedIn?.identityContractID
    if (!identityContractID) {
      throw new Error('Unable to update lastLoggedIn without an active session')
    }

    if (throttle) {
      const state = sbp('state/vuex/state')
      const lastLoggedIn = new Date(state.lastLoggedIn?.[contractID]?.[identityContractID]).getTime()

      if ((Date.now() - lastLoggedIn) < LAST_LOGGED_IN_THROTTLE_WINDOW) return
    }

    const now = new Date().toISOString()
    return sbp('okTurtles.eventQueue/queueEvent', KV_QUEUE, async () => {
      const getUpdatedLastLoggedIn = async (contractID) => {
        const current = await sbp('gi.actions/group/kv/fetchLastLoggedIn', { contractID })
        return { ...current, [identityContractID]: now }
      }

      const data = await getUpdatedLastLoggedIn(contractID)
      await sbp('chelonia/kv/set', contractID, KV_KEYS.LAST_LOGGED_IN, data, {
        encryptionKeyId: await sbp('chelonia/contract/currentKeyIdByName', contractID, 'cek'),
        signingKeyId: await sbp('chelonia/contract/currentKeyIdByName', contractID, 'csk'),
        onconflict: getUpdatedLastLoggedIn
      })
    })
  }
}): string[])
