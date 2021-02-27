// https://flowtype.org/docs/objects.html

export const RESPONSE_TYPE: {[key: string]: string} = Object.freeze({
  ERROR: 'error',
  SUCCESS: 'success',
  ALREADY: 'already',
  SUB: 'sub',
  UNSUB: 'unsub',
  PUB: 'pub',
  ENTRY: 'entry'
})
