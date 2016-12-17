// see also: // https://flowtype.org/docs/modules.html#import-type
export type EvType = EvTypeErr | EvTypeOK
export type EvTypeErr = 'error'
export type EvTypeOK = 'success' | 'event'

// https://flowtype.org/docs/objects.html
export const EVENT_TYPE: {[key: string]: EvType} = {
  ERROR: ('error': EvTypeErr),
  SUCCESS: ('success': EvTypeOK),
  EVENT: ('event': EvTypeOK)
}
