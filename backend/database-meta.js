'use strict'

const readConfig = () => {
  const configString = process.env.GI_PERSIST_META_CONFIG
  const config = JSON.parse(configString)

  if (!config['*']) {
    throw new Error('Fallback storage (*) is required')
  }

  return config
}
let config
const backends = Object.create(null)

const lookupBackend = (key) => {
  const keys = Object.keys(config)
  for (let i = 0; i < keys.length; i++) {
    if (key.slice(0, keys[i].length) === keys[i]) {
      return config[keys[i]]
    }
  }
  return backends[config['*']]
}

export async function initStorage (options: Object = {}): Promise<void> {
  config = readConfig()
  const persistences = [...new Set(Object.values(config))]
  await Promise.all(persistences.map(async (persistence) => {
    const { initStorage, readData, writeData, deleteData } = await import(`./database-${persistence}.js`)
    backends[persistence] = { readData, writeData, deleteData }
    await initStorage()
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
