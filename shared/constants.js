import type {ResType} from './types'

// https://flowtype.org/docs/objects.html

export const RESPONSE_TYPE: {[key: string]: ResType} = {
  ERROR: 'error',
  SUCCESS: 'success',
  ALREADY: 'already',
  JOINED: 'joined',
  LEFT: 'left',
  ENTRY: 'entry'
}
