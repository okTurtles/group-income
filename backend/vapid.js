import sbp from '@sbp/sbp'

let vapidPublicKey: string
let vapidPrivateKey: Object

// The Voluntary Application Server Identification (VAPID) email field is "a
// stable identity for the application server" that "can be used by a push
// service to establish behavioral expectations for an application server"
// RFC 8292
if (!process.env.VAPID_EMAIL) {
  console.warn('Missing VAPID identification. Please set VAPID_EMAIL to a value like "mailto:some@example".')
}
const vapid = { VAPID_EMAIL: process.env.VAPID_EMAIL || 'mailto:test@example.com' }

export const initVapid = async () => {
  const vapidKeyPair = await sbp('chelonia/db/get', '_private_immutable_vapid_key').then(async (vapidKeyPair: string): Promise<[Object, string]> => {
    if (!vapidKeyPair) {
      // Generate a new ECDSA key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256' // Use P-256 curve
        },
        true, // Whether the key is extractable
        ['sign', 'verify'] // Usages
      )

      // Export the private key
      const serializedKeyPair = await Promise.all([
        crypto.subtle.exportKey('jwk', keyPair.privateKey),
        crypto.subtle.exportKey('raw', keyPair.publicKey).then((key) =>
          // $FlowFixMe[incompatible-call]
          Buffer.from(key).toString('base64url')
        )
      ])

      return sbp('chelonia/db/set', '_private_immutable_vapid_key', JSON.stringify(serializedKeyPair)).then(() => {
        return [keyPair.privateKey, serializedKeyPair[1]]
      })
    }

    const serializedKeyPair = JSON.parse(vapidKeyPair)
    return [
      await crypto.subtle.importKey(
        'jwk',
        serializedKeyPair[0],
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      ),
      serializedKeyPair[1]
    ]
  })

  vapidPrivateKey = vapidKeyPair[0]
  vapidPublicKey = vapidKeyPair[1]
}

const generateJwt = async (endpoint: URL): Promise<string> => {
  const now = Date.now() / 1e3 | 0

  const audience = endpoint.origin

  const header = Buffer.from(JSON.stringify(
    Object.fromEntries([['typ', 'JWT'], ['alg', 'ES256']])
    // $FlowFixMe[incompatible-call]
  )).toString('base64url')
  const body = Buffer.from(JSON.stringify(
    Object.fromEntries([
      ['aud', audience],
      ['exp', now + 90],
      ['iat', now],
      ['nbf', now - 90],
      ['sub', vapid.VAPID_EMAIL]
    ])
    // $FlowFixMe[incompatible-call]
  )).toString('base64url')

  const signature = Buffer.from(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      vapidPrivateKey,
      Buffer.from([header, body].join('.'))
    )
  ).toString('base64url')

  console.error('@@@JWT', [header, body, signature].join('.'))

  return [header, body, signature].join('.')
}

export const getVapidPublicKey = (): string => vapidPublicKey

export const vapidAuthorization = async (endpoint: URL): Promise<string> => {
  const jwt = await generateJwt(endpoint)
  return `vapid t=${jwt}, k=${vapidPublicKey}`
}