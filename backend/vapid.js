import sbp from '@sbp/sbp'
import { Buffer } from 'node:buffer'

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
  const vapidKeyPair = await sbp('chelonia.db/get', '_private_immutable_vapid_key').then(async (vapidKeyPair: string): Promise<[Object, string]> => {
    if (!vapidKeyPair) {
      console.info('Generating new VAPID keypair...')
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

      return sbp('chelonia.db/set', '_private_immutable_vapid_key', JSON.stringify(serializedKeyPair)).then(() => {
        console.info('Successfully saved newly generated VAPID keys')
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

  // `endpoint` is coerced into a URL in subscriptionInfoWrapper
  // The audience is the origin, see RFC 8292 (VAPID) section 2:
  // <https://datatracker.ietf.org/doc/html/rfc8292#section-2>
  const audience = endpoint.origin

  const header = Buffer.from(JSON.stringify(
    Object.fromEntries([['typ', 'JWT'], ['alg', 'ES256']])
    // $FlowFixMe[incompatible-call]
  )).toString('base64url')
  const body = Buffer.from(JSON.stringify(
    // We're expecting to use the JWT immediately. We set a 10-minute window
    // for using the JWT (5 minutes into the past, 5 minutes into the future)
    // to account for potential network delays and clock drift.
    Object.fromEntries([
      // token audience
      ['aud', audience],
      // 'expiry' / 'not after' value for the token
      ['exp', now + 300],
      // (optional) issuance time for the token
      ['iat', now],
      // 'not before' value for the JWT
      ['nbf', now - 300],
      // URI used for identifying ourselves. This can be used by the push
      // provider to get in touch in case of issues.
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

  return [header, body, signature].join('.')
}

export const getVapidPublicKey = (): string => vapidPublicKey

export const vapidAuthorization = async (endpoint: URL): Promise<string> => {
  const jwt = await generateJwt(endpoint)
  return `vapid t=${jwt}, k=${vapidPublicKey}`
}
