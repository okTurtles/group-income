window.process = {
  env: {
    get (key) {
      return Deno.env.get(key)
    },
    set (key, value) {
      return Deno.env.set(key, value)
    }
  }
}
console.log(process);
