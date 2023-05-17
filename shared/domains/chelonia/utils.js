import type { GIKey, GIKeyPurpose } from './GIMessage.js'

export const findKeyIdByName = (state: Object, name: string): ?string => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) => k.name === name)?.id

export const findSuitableSecretKeyId = (state: Object, permissions: '*' | string[], purposes: GIKeyPurpose[], ringLevel?: number, additionalKeyIds: ?string[]): ?string => {
  return state._vm?.authorizedKeys &&
    (state._volatile?.keys || additionalKeyIds?.length) &&
    ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) =>
      (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) &&
      (state._volatile?.keys?.[k.id] || additionalKeyIds?.includes(k.id)) &&
      (Array.isArray(permissions)
        ? permissions.reduce((acc, permission) =>
          acc && (k.permissions === '*' || k.permissions.includes(permission)), true
        )
        : permissions === k.permissions
      ) &&
      purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))?.id
}

// TODO: Resolve inviteKey being added (doesn't have krs permission)
export const findSuitablePublicKeyIds = (state: Object, permissions: '*' | string[], purposes: GIKeyPurpose[], ringLevel?: number): ?string[] => {
  return state._vm?.authorizedKeys &&
    ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).filter((k) =>
      (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) &&
      (Array.isArray(permissions)
        ? permissions.reduce((acc, permission) => acc && (k.permissions === '*' || k.permissions.includes(permission)), true)
        : permissions === k.permissions
      ) &&
      purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))?.map((k) => k.id)
}

export const validateKeyAddPermissions = (contractID: string, signingKey: GIKey, state: Object, v: GIKey[]) => {
  const signingKeyPermissions = Array.isArray(signingKey.permissions) ? new Set(signingKey.permissions) : signingKey.permissions
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_ADD must exist in _vm.authorizedKeys. contractID=' + contractID + ' singingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.forEach(k => {
    if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
      throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to add a key with rignLevel ' + k.ringLevel)
    }
    if (signingKeyPermissions !== '*') {
      if (!Array.isArray(k.permissions) || !k.permissions.reduce((acc, cv) => acc && signingKeyPermissions.has(cv), true)) {
        throw new Error('Unable to add key with more permissions than the signing key. singingKey permissions: ' + String(signingKey?.permissions) + '; key add permissions: ' + String(k.permissions))
      }
    }
  })
}

export const validateKeyDelPermissions = (contractID: string, signingKey: GIKey, state: Object, v: string[]) => {
  if (!state._vm?.authorizedKeys?.[signingKey.id]) throw new Error('Singing key for OP_KEY_DEL must exist in _vm.authorizedKeys. contractID=' + contractID + ' singingKeyId=' + signingKey.id)
  const localSigningKey = state._vm.authorizedKeys[signingKey.id]
  v.map(id => state._vm.authorizedKeys[id]).forEach((k, i) => {
    if (!k) throw new Error('Nonexisting key ID ' + v[i])
    if (!Number.isSafeInteger(k.ringLevel) || k.ringLevel < localSigningKey.ringLevel) {
      throw new Error('Signing key has ringLevel ' + localSigningKey.ringLevel + ' but attempted to remove a key with ringLevel ' + k.ringLevel)
    }
  })
}
