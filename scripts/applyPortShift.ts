/**
 * Creates a modified copy of the given `process.env` object, according to its `PORT_SHIFT` variable.
 *
 * The `API_PORT` and `API_URL` variables will be updated.
 * TODO: make the protocol (http vs https) variable based on environment var.
 * @param {Object} env
 * @returns {Object}
 */
export default function applyPortShift (env: ReturnType<typeof Deno.env.toObject>) {
  // TODO: implement automatic port selection when `PORT_SHIFT` is 'auto'.
  const API_PORT = 8000 + Number.parseInt(env.PORT_SHIFT || '0')
  const API_URL = 'http://127.0.0.1:' + API_PORT

  if (Number.isNaN(API_PORT) || API_PORT < 8000 || API_PORT > 65535) {
    throw new RangeError(`Invalid API_PORT value: ${API_PORT}.`)
  }
  return { ...env, API_PORT: String(API_PORT), API_URL: String(API_URL) }
}
