import sbp from '@sbp/sbp'

export default (sbp('sbp/selectors/register', {
  'chelonia/kv/queuedSet': ({ contractID, key, data, onconflict, encryptionKeyName = 'cek', signingKeyName = 'csk' }) => {
    return sbp('chelonia/queueInvocation', contractID, () => {
      return sbp('chelonia/kv/set', contractID, key, data, {
        encryptionKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, encryptionKeyName),
        signingKeyId: sbp('chelonia/contract/currentKeyIdByName', contractID, signingKeyName),
        onconflict
      })
    })
  }
}): string[])
