import {JSONObject} from './types'
export type EventType = EventTypePayment | EventTypeCreation | EventTypeVoting
export type EventTypePayment = 'Payment'
export type EventTypeCreation = 'Creation'
export type EventTypeVoting = 'Voting'

export type Event = {
 type: EventType;
 payload: JSONObject;
 version: ?string;
}

export const EVENTS: {[key: string]: EventType} = {
  PAYMENT: ('Payment': EventTypePayment),
  CREATION: ('Creation': EventTypeCreation),
  VOTING: ('Voting': EventTypeVoting)
}
