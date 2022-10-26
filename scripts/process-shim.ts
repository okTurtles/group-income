type EnvRecord = Record<string, string>

// @ts-expect-error Element implicitly has an 'any' type.
globalThis.process = {
  env: new Proxy({} as EnvRecord, {
    get (obj: EnvRecord, key: string): string | void {
      return Deno.env.get(key)
    },
    set (obj: EnvRecord, key: string, value: string): boolean {
      Deno.env.set(key, value)
      return true
    }
  })
}
