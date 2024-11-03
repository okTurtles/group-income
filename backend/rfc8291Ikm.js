// $FlowFixMe[missing-export]
import { webcrypto as crypto } from 'crypto' // Needed for Node 18 and under

// Key derivation as per RFC 8291 (for sending encrypted push notifications)
export default async (uaPublic: Uint8Array, salt: SharedArrayBuffer): Promise<[ArrayBuffer, ArrayBuffer]> => {
  const [[asPrivateKey, asPublic], uaPublicKey] = await Promise.all([
    crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      ['deriveKey']
    ).then(async (asKeyPair) => {
      const asPublic = await crypto.subtle.exportKey(
        'raw',
        asKeyPair.publicKey
      )

      return [asKeyPair.privateKey, asPublic]
    }),
    crypto.subtle.importKey(
      'raw',
      uaPublic,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    )
  ])

  const ecdhSecret = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: uaPublicKey
    },
    asPrivateKey,
    {
      name: 'HKDF',
      hash: 'SHA-256'
    },
    false,
    ['deriveBits']
  )

  // The `WebPush: info\x00` string
  const infoString = new Uint8Array([
    0x57,
    0x65,
    0x62,
    0x50,
    0x75,
    0x73,
    0x68,
    0x3a,
    0x20,
    0x69,
    0x6e,
    0x66,
    0x6f,
    0x00
  ])
  const info = new Uint8Array(infoString.byteLength + uaPublic.byteLength + asPublic.byteLength)
  info.set(infoString, 0)
  info.set(uaPublic, infoString.byteLength)
  info.set(asPublic, infoString.byteLength + uaPublic.byteLength)

  const IKM = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info
    },
    ecdhSecret,
    32 << 3
  )

  // Role in RFC8188: `asPublic` is used as key ID, IKM as IKM.
  return [asPublic, IKM]
}
