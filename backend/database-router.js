'use strict'

const readConfig = () => {
  const configString = process.env.GI_PERSIST_ROUTER_CONFIG
  const config = JSON.parse(configString)

  if (!config['*']) {
    throw new Error('Fallback storage (*) is required')
  }
  // Return a sorted copy where entries with longer keys come first.
  return Object.fromEntries(Object.entries(config).sort((a, b) => a[0].length - b[0].length))
}
let config
const backends = Object.create(null)

const lookupBackend = (key) => {
  const keyPrefixes = Object.keys(config)
  for (let i = 0; i < keyPrefixes.length; i++) {
    if (key.startsWith(keyPrefixes[i])) {
      return backends[keyPrefixes[i]]
    }
  }
  return backends['*']
}

export async function initStorage (options: Object = {}): Promise<void> {
  config = readConfig()
  const entries = Object.values(config)
  await Promise.all(entries.map(async ([keyPrefix, { name, options }]) => {
    const Ctor = (await import(`./database-${name}.js`)).default
    const backend = new Ctor(options)
    await backend.init()
    backends[keyPrefix] = backend
  }))
}

// eslint-disable-next-line require-await
export async function readData (key: string): Promise<Buffer | string | void> {
  return lookupBackend(key).readData(key)
}

// eslint-disable-next-line require-await
export async function writeData (key: string, value: Buffer | string): Promise<void> {
  return lookupBackend(key).writeData(key)
}

// eslint-disable-next-line require-await
export async function deleteData (key: string): Promise<void> {
  return lookupBackend(key).deleteData(key)
}
