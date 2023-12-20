export default (tag) => ({
  log: console.log.bind(console, tag),
  debug: console.debug.bind(console, tag),
  error: console.error.bind(console, tag),
  info: console.debug.bind(console, tag),
  warn: console.debug.bind(console, tag)
})
