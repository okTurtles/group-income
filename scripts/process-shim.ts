/* globals Deno */
const process = {
  env: {
    get (key: string): string | void {
      return Deno.env.get(key)
    },
    set (key: string, value: string): void {
      return Deno.env.set(key, value)
    }
  }
}

// @ts-ignore
globalThis.process = process
