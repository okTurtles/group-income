import type { ResType } from './types'

// https://flowtype.org/docs/objects.html

export const RESPONSE_TYPE: {[key: string]: ResType} = {
  ERROR: 'error',
  SUCCESS: 'success',
  ALREADY: 'already',
  SUB: 'sub',
  UNSUB: 'unsub',
  PUB: 'pub',
  ENTRY: 'entry'
}
