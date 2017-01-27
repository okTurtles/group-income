// see also: // https://flowtype.org/docs/modules.html#import-type
export type EvType = EvTypeErr | EvTypeOK
export type EvTypeErr = 'error'
export type EvTypeOK = 'success'

export type EntryType = EntryPayment | EntryCreation | EntryVoting
export type EntryPayment = 'payment'
export type EntryCreation = 'creation' // TODO: creation of what? come up with better name
export type EntryVoting = 'voting'

// https://flowtype.org/docs/objects.html
export const EVENT_TYPE: {[key: string]: EvType} = {
  ERROR: ('error': EvTypeErr),
  SUCCESS: ('success': EvTypeOK)
}
export const ENTRY_TYPE: {[key: string]: EntryType} = {
  PAYMENT: ('payment': EntryPayment),
  CREATION: ('creation': EntryCreation),
  VOTING: ('voting': EntryVoting)
}
