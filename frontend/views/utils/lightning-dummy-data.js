import { randomHexString } from '@model/contracts/shared/giLodash.js'

export const dummyLightningUsers = [
  {
    username: 'fake-user-1',
    email: 'fake1@abc.com',
    password: '123456789'
  },
  {
    username: 'fake-user-2',
    email: 'fake2@def.com',
    password: '123456789'
  }
]

export const dummyLightningTodoItems = [
  {
    // $FlowFixMe
    hash: randomHexString(10),
    username: 'fake-user-1',
    displayName: 'fake-user-1',
    amount: 98.57,
    total: 98.57,
    partial: false,
    isLate: false,
    date: '2022-09-24T11:27:28.893Z'
  },
  {
    // $FlowFixMe
    hash: randomHexString(10),
    username: 'fake-user-2',
    displayName: 'fake-user-2',
    amount: 250,
    total: 250,
    partial: false,
    isLate: false,
    date: '2022-09-24T11:27:28.893Z'
  }
]

export const dummyLightningPaymentDetails = {
  data: {
    // $FlowFixMe
    transactionId: randomHexString(50),
    toUser: 'fake-user-2',
    amount: 98.57142857,
    groupMincome: 1000,
    memo: 'Love you so much! Thank you for the Portuguese class last week. P.S.: sent to the Paypal email on your profile.',
    currencyFromTo: ['USD', 'USD']
  },
  meta: {
    createdDate: '2022-09-08T07:54:13.809Z',
    username: 'fake-user-1'
  }
}
