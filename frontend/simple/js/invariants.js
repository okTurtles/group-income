/*
* This file contains the invariant functions to be used as transaction steps
* Rules:
* 1. Create a new version of a function if you have to modify it after its initial pull request has been acccepted
* 2. Update the version constant when modifying
* 3. All Invariants must make AT MOST 1 async call
* 4. Make internal functionality as atomic as possible
 */
export const publishLogEntry = 'publishLogEntryV1'
export async function publishLogEntryV1 ({backend, contractId, entry}) {
  await backend.publishLogEntry(contractId, entry)
}
export const namespaceRegister = 'namespaceRegisterV1'
export async function namespaceRegisterV1 ({namespace, name, value}) {
  await namespace.register(name, value)
}

export const backendSubscribe = 'backendSubscribeV1'
export async function backendSubscribeV1 ({backend, contractId}) {
  await backend.subscribe(contractId)
}

export const identitySetAttribute = 'identitySetAttributeV1'
export async function identitySetAttributeV1 ({backend, Events, contractId, latestHash, name, value}) {
  let attribute = new Events.HashableIdentitySetAttribute({attribute: {name, value}}, latestHash)
  await backend.publishLogEntry(contractId, attribute)
}
