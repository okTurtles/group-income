/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import { groupIncomeDistributionLogic, dataToEvents } from './group-income-distribution.js'

describe('group income distribution logic', function () {
  it('can distribute income evenly with two users', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('has no effect for adjustment when there are no payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('ignores existing payments when not adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(dist).eql([
      { amount: 2, from: 'u1', to: 'u2' }
    ])
  })

  it('takes into account payments from this month when adjusted', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 12,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 2, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 1]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 925, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 75, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 25, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 2]', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 700, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 25, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 75, from: 'u1', to: 'u3' }
    ])
  })

  it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([])
  })

  it('[scenario 4.1] can distribute money from new members', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 50, from: 'u4', to: 'u2' },
      { amount: 50, from: 'u4', to: 'u3' }
    ])
  })

  it('splits money evenly between two pledgers and two needers', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(dist).eql([
      { amount: 71.42857143, from: 'u1', to: 'u2' },
      { amount: 178.57142857, from: 'u1', to: 'u3' },
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  it('stops asking user to pay someone they fully paid their share to', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 178.57, from: 'u1', to: 'u3' },
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })

  it.skip('does not ask users who have paid their full share to pay any more', function () {
    const dist = groupIncomeDistributionLogic({
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 250, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 750, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 100, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 71.43, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
          'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u2': ['payment1'], 'u3': ['payment2'] }
            }
          }
        }
      }
    })
    should(dist).eql([
      { amount: 28.57142857, from: 'u4', to: 'u2' },
      { amount: 71.42857143, from: 'u4', to: 'u3' }
    ])
  })
})

describe('helper function', function () {

  it('can transform payment/join data into events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [
        { name: 'u1', have: 50 },
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('sorts payments and joins by date', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' },
          'payment2': { amount: 20, exchangeRate: 1, status: 'completed', createdDate: '2020-10-22T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1', 'payment2'] }
            }
          }
        }
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [
        { name: 'u1', have: 50 },
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 },
        { type: 'payment', from: 'u1', to: 'u3', amount: 20 }
      ]
    })
  })

  it('works with no events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [
        { name: 'u1', have: 50 },
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: []
    })
  })

  it('works with only payment events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [
        { name: 'u1', have: 50 },
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
      ]
    })
  })

  it('works with only join events', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [
        { name: 'u1', have: 50 },
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: [
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('works with no members', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {},
      adjustWith: {
        monthstamp: '2020-10',
        payments: {},
        monthlyPayments: {}
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [],
      events: []
    })
  })

  it('works when members have paid and left', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' }
      },
      adjustWith: {
        monthstamp: '2020-10',
        payments: {
          'payment1': { amount: 50, exchangeRate: 1, status: 'completed', createdDate: '2020-10-12T00:00:00.000Z' }
        },
        monthlyPayments: {
          '2020-10': {
            mincomeExchangeRate: 1,
            paymentsFrom: {
              'u1': { 'u3': ['payment1'] }
            }
          }
        }
      }
    })
    should(events).eql({
      mincome: 1000,
      members: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

})
