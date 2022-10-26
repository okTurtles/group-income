/* globals Deno */

// @ts-expect-error 'typeof globalThis' has no index signature.
globalThis.process = {
  env: {
    get (key: string): string | void {
      return Deno.env.get(key)
    },
    set (key: string, value: string): void {
      return Deno.env.set(key, value)
    }
  }
}
