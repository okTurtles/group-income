import type { GIKey, GIKeyPurpose } from './GIMessage.js'

export const findKeyIdByName = (state: Object, name: string): ?string => state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) => k.name === name)?.id

export const findSuitableSecretKeyId = (state: Object, permissions: string[], purposes: GIKeyPurpose[], ringLevel?: number, additionalKeyIds: ?string[]): ?string => {
  return state._vm?.authorizedKeys && (state._volatile?.keys || additionalKeyIds?.length) && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).find((k) => (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) && (state._volatile?.keys?.[k.id] || additionalKeyIds?.includes(k.id)) && permissions.reduce((acc, permission) => acc && k.permissions.includes(permission), true) && purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))?.id
}

export const findSuitablePublicKeyIds = (state: Object, permissions: string[], purposes: GIKeyPurpose[], ringLevel?: number): ?string[] => {
  return state._vm?.authorizedKeys && ((Object.values((state._vm.authorizedKeys: any)): any): GIKey[]).filter((k) => (k.ringLevel <= (ringLevel ?? Number.POSITIVE_INFINITY)) && permissions.reduce((acc, permission) => acc && k.permissions.includes(permission), true) && purposes.reduce((acc, purpose) => acc && k.purpose.includes(purpose), true))?.map((k) => k.id)
}
