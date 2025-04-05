'use strict'

import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import DatabaseBackend from './DatabaseBackend.js'

type Config = {
  [string]: { name: string, options: Object }
}
type ConfigEntry = { name: string, options: Object }

const { GI_PERSIST_ROUTER_CONFIG_PATH = './database-router-config.json' } = process.env

export default class RouterBackend extends DatabaseBackend {
  backends: Object
  config: Config

  lookupBackend (key: string): Object {
    const { backends, config } = this
    const keyPrefixes = Object.keys(config)
    for (let i = 0; i < keyPrefixes.length; i++) {
      if (key.startsWith(keyPrefixes[i])) {
        return backends[keyPrefixes[i]]
      }
    }
    return backends['*']
  }

  async readConfig (): Promise<Config> {
    const configString = await readFile(resolve(GI_PERSIST_ROUTER_CONFIG_PATH), 'utf8')
    const config = JSON.parse(configString)
    // Return a sorted copy where entries with longer keys come first.
    // $FlowFixMe
    return Object.fromEntries(Object.entries(config).sort((a, b) => b[0].length - a[0].length))
  }

  validateConfig (config: Config): Array<{ msg: string, entry?: ConfigEntry }> {
    const errors = []
    if (!config['*']) {
      errors.push({ msg: 'Missing key: "*" (fallback storage is required)' })
    }
    for (const entry of ((Object.entries(config): any): ConfigEntry[])) {
      const value = entry[1]
      if (typeof value?.name !== 'string' || typeof value?.options !== 'object') {
        errors.push({ msg: 'entry value must be of type { name: string, options: Object }', entry })
        continue
      }
      if (value.name === 'router') {
        errors.push({ msg: 'Router backends cannot be nested.', entry })
        continue
      }
    }
    return errors
  }

  async init (options: Object = {}): Promise<void> {
    // Init config
    this.config = await this.readConfig()
    const errors = this.validateConfig(this.config)
    if (errors.length) {
      // $FlowFixMe[extra-arg]
      throw new Error(`[${this.constructor.name}] ${errors.length} error(s) found in your config.`, { cause: errors })
    }
    // Init backends
    this.backends = Object.create(null)
    const entries = ((Object.entries(this.config): any): ConfigEntry[])
    await Promise.all(entries.map(async entry => {
      const [keyPrefix, { name, options }] = entry
      const Ctor = (await import(`./database-${name}.js`)).default
      const backend = new Ctor(options)
      await backend.init()
      this.backends[keyPrefix] = backend
    }))
  }

  async readData (key: string): Promise<Buffer | string | void> {
    return await this.lookupBackend(key).readData(key)
  }

  async writeData (key: string, value: Buffer | string): Promise<void> {
    return await this.lookupBackend(key).writeData(key, value)
  }

  async deleteData (key: string): Promise<void> {
    return await this.lookupBackend(key).deleteData(key)
  }

  async clear (): Promise<void> {
    for (const backend of new Set(Object.values(this.backends))) {
      // $FlowFixMe[incompatible-use]
      await backend.clear()
    }
  }
}
