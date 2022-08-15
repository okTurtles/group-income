'use strict'

import { unionOf, literalOf } from '~/frontend/model/contracts/misc/flowTyper.js'

export const PAYMENT_PENDING = 'pending'
export const PAYMENT_CANCELLED = 'cancelled'
export const PAYMENT_ERROR = 'error'
export const PAYMENT_NOT_RECEIVED = 'not-received'
export const PAYMENT_COMPLETED = 'completed'
export const paymentStatusType: string = unionOf(...[PAYMENT_PENDING, PAYMENT_CANCELLED, PAYMENT_ERROR, PAYMENT_NOT_RECEIVED, PAYMENT_COMPLETED].map(k => literalOf(k)))
export const PAYMENT_TYPE_MANUAL = 'manual'
export const PAYMENT_TYPE_BITCOIN = 'bitcoin'
export const PAYMENT_TYPE_PAYPAL = 'paypal'
export const paymentType: string = unionOf(...[PAYMENT_TYPE_MANUAL, PAYMENT_TYPE_BITCOIN, PAYMENT_TYPE_PAYPAL].map(k => literalOf(k)))
