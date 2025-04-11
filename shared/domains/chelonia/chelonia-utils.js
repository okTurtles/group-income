import sbp from '@sbp/sbp'

export default (sbp('sbp/selectors/register', {
  // This selector is a wrapper for the `chelonia/kv/set` selector that uses
  // the contract queue and allows referring to keys by name, with default key
  // names set to `csk` and `cek` for signatures and encryption, respectively.
  // For most 'simple' use cases, this selector is a better choice than
  // `chelonia/kv/set`. However, the `chelonia/kv/set` primitive is needed if
  // the queueing logic needs to be more advanced, the key to use requires
  // custom logic or _if the `onconflict` callback also needs to be queued_.
  'chelonia/kv/queuedSet': ({ contractID, key, data, onconflict, ifMatch, encryptionKeyName = 'cek', signingKeyName = 'csk' }) => {
    return sbp('chelonia/queueInvocation', contractID, () => {
      return sbp('chelonia/kv/set', contractID, key, data, {
        ifMatch,
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, encryptionKeyName),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, signingKeyName),
        onconflict
      })
    })
  }
}): string[])
