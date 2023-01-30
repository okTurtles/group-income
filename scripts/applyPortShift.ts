/**
 * Creates a modified copy of the given `process.env` object, according to its `PORT_SHIFT` variable.
 *
 * The `API_HOSTNAME`, `API_PORT` and `API_URL` variables will be updated.
 * TODO: make the protocol (http vs https) variable based on environment var.
 * TODO: implement automatic port selection when `PORT_SHIFT` is 'auto'.
 * @param {Object} env
 * @returns {Object}
 */
export default function applyPortShift (env: ReturnType<typeof Deno.env.toObject>) {
  // In development we're using BrowserSync, whose proxy tries to connect only via ipv4,
  //   hence our server must be accessible via ipv4.
  // By default, on Linux 'localhost' refers to both the ipv4 and ipv6 endpoints,
  //   while on MacOS and Windows it only resolves to the ipv6 one, so we have to specify
  //   '127.0.0.1' to listen via ipv4.
  // However modern browsers tend to try ipv6 first and only fallback to ipv4 if it fails,
  //   so in production and/or on other OSes it's better to listen via both, or only via ipv6
  //   if we don't want two listeners.
  const API_HOSTNAME = env.NODE_ENV === 'production' || Deno.build.os === 'linux' ? 'localhost' : '127.0.0.1'
  const API_PORT = 8000 + Number.parseInt(env.PORT_SHIFT || '0')
  const API_URL = `http://${API_HOSTNAME}:${API_PORT}`

  if (Number.isNaN(API_PORT) || API_PORT < 8000 || API_PORT > 65535) {
    throw new RangeError(`Invalid API_PORT value: ${API_PORT}.`)
  }
  return { ...env, API_HOSTNAME, API_PORT: String(API_PORT), API_URL }
}
