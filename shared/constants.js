import type {
  ResType, EntryType
} from './types'

// https://flowtype.org/docs/objects.html

export const RESPONSE_TYPE: {[key: string]: ResType} = {
  ERROR: 'error',
  SUCCESS: 'success',
  ALREADY: 'already',
  JOINED: 'joined',
  LEFT: 'left',
  ENTRY: 'entry'
}
export const ENTRY_TYPE: {[key: string]: EntryType} = {
  PAYMENT: 'payment',
  CREATION: 'creation',
  VOTING: 'voting'
}
