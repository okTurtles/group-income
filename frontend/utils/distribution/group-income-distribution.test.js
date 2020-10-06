/* eslint-env mocha */

// For rapid development, run these tests with:
// ./node_modules/.bin/mocha -w -R min --require Gruntfile.js frontend/utils/distribution/group-income-distribution.test.js

import should from 'should'
import { groupIncomeDistributionLogic, groupIncomeDistributionNewLogic, dataToEvents } from './group-income-distribution.js'

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
          'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-13T00:00:00.000Z' }
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

  describe('using new data->events helper function', function () {
    it('can distribute income evenly with two users', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 },
        ],
        needs: [
          { name: 'u2', need: 2 },
        ],
        events: []
      })).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('can distribute income evenly with three users but still have need', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 9 },
        ],
        needs: [
          { name: 'u2', need: 40 },
          { name: 'u3', need: 80 },
        ],
        events: []
      })).eql([
        { amount: 3, from: 'u1', to: 'u2' },
        { amount: 6, from: 'u1', to: 'u3' }
      ])
    })

    it('can distribute income evenly with three users and excess', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 21 },
        ],
        needs: [
          { name: 'u2', need: 4 },
          { name: 'u3', need: 8 },
        ],
        events: []
      })).eql([
        { amount: 4, from: 'u1', to: 'u2' },
        { amount: 8, from: 'u1', to: 'u3' }
      ])
    })

    it('distribute income above mincome proportionally', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'd', have: 10 },
          { name: 'e', have: 30 },
          { name: 'f', have: 60 },
        ],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 },
        ],
        events: []
      })).eql([
        { amount: 3, from: 'd', to: 'a' },
        { amount: 9, from: 'e', to: 'a' },
        { amount: 18, from: 'f', to: 'a' },
        { amount: 2, from: 'd', to: 'b' },
        { amount: 6, from: 'e', to: 'b' },
        { amount: 12, from: 'f', to: 'b' }
      ])
    })

    it('distribute income above mincome proportionally when extra won\'t cover need', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'd', have: 4 },
          { name: 'e', have: 4 },
          { name: 'f', have: 10 },
        ],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 },
        ],
        events: []
      })).eql([
        { amount: 2.4, from: 'd', to: 'a' },
        { amount: 2.4, from: 'e', to: 'a' },
        { amount: 6, from: 'f', to: 'a' },
        { amount: 1.6, from: 'd', to: 'b' },
        { amount: 1.6, from: 'e', to: 'b' },
        { amount: 3.9999999999999996, from: 'f', to: 'b' }
      ])
    })

    it('don\'t distribute anything if no one is above mincome', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [],
        needs: [
          { name: 'a', need: 30 },
          { name: 'b', need: 20 },
          { name: 'd', need: 5 },
          { name: 'e', need: 20 },
          { name: 'f', need: 30 },
        ],
        events: []
      })).eql([
      ])
    })

    it('don\'t distribute anything if everyone is above mincome', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'b', have: 5 },
          { name: 'd', have: 10 },
          { name: 'e', have: 60 },
          { name: 'f', have: 12 },
        ],
        needs: [],
        events: []
      })).eql([
      ])
    })

    it('works with very imprecise splits', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 75 },
        ],
        needs: [
          { name: 'u2', need: 25 },
          { name: 'u3', need: 300 },
        ],
        events: []
      })).eql([
        { amount: 5.769230769230769, from: 'u1', to: 'u2' },
        { amount: 69.23076923076924, from: 'u1', to: 'u3' }
      ])
    })

    it('splits money evenly', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 9 },
        ],
        needs: [
          { name: 'u2', need: 80 },
          { name: 'u3', need: 40 },
        ],
        events: []
      })).eql([
        { amount: 6, from: 'u1', to: 'u2' },
        { amount: 3, from: 'u1', to: 'u3' }
      ])
    })

    it('has no effect for adjustment when there are no payments', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('ignores existing payments when not adjusted', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 2, from: 'u1', to: 'u2' }
      ])
    })

    it('takes into account payments from this month when adjusted', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 2 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 1]', function () {
      should(groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 75 },
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 75 },
          { type: 'join', name: 'u3', need: 50 }
        ]
      })).eql([
        { amount: 25, from: 'u1', to: 'u3' }
      ])
    })

    it('[scenario 2]', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 100 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 300 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 25 }
        ]
      })
      should(dist).eql([
        { amount: 75, from: 'u1', to: 'u3' }
      ])
    })

    it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
        ]
      })
      should(dist).eql([])
    })

    it('[scenario 4.1] can distribute money from new members', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
          { name: 'u4', have: 150, type: 'join' }
        ]
      })
      should(dist).eql([
        { amount: 50, from: 'u4', to: 'u2' },
        { amount: 50, from: 'u4', to: 'u3' }
      ])
    })

    it('splits money evenly between two pledgers and two needers', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: []
      })
      should(dist).eql([
        { amount: 71.42857142857143, from: 'u1', to: 'u2' },
        { amount: 28.57142857142857, from: 'u4', to: 'u2' },
        { amount: 178.57142857142858, from: 'u1', to: 'u3' },
        { amount: 71.42857142857143, from: 'u4', to: 'u3' }
      ])
    })

    it('stops asking user to pay someone they fully paid their share to', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 }
        ]
      })
      should(dist).eql([
        { amount: 28.57142857142857, from: 'u4', to: 'u2' },
        { amount: 178.57, from: 'u1', to: 'u3' },
        { amount: 71.42857142857143, from: 'u4', to: 'u3' }
      ])
    })

    it.skip('does not ask users who have paid their full share to pay any more', function () {
      const dist = groupIncomeDistributionNewLogic({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 },
          { type: 'payment', from: 'u1', to: 'u3', amount: 100 },
        ]
      })
      should(dist).eql([
        { amount: 28.57142857, from: 'u4', to: 'u2' },
        { amount: 71.42857143, from: 'u4', to: 'u3' }
      ])
    })
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
      haves: [
        { name: 'u1', have: 50 },
      ],
      needs: [
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
      haves: [
        { name: 'u1', have: 50 },
      ],
      needs: [
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
      haves: [
        { name: 'u1', have: 50 },
      ],
      needs: [
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
      haves: [
        { name: 'u1', have: 50 },
      ],
      needs: [
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
      haves: [
        { name: 'u1', have: 50 },
      ],
      needs: [
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
      haves: [],
      needs: [],
      events: []
    })
  })

  it('works with no adjustWith arguments', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {}
    })
    should(events).eql({
      haves: [],
      needs: [],
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
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      haves: [],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  it('ignores users who have no need or excess', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 0, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u3': { incomeDetailsType: 'incomeAmount', incomeAmount: 900, joinedDate: '2020-09-15T00:00:00.000Z' }
      }
    })
    should(events).eql({
      haves: [],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: []
    })
  })

  it('can handle a mix of havers/needers in any order', function () {
    const events = dataToEvents('2020-10', {
      mincomeAmount: 1000,
      groupProfiles: {
        'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 950, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 50, joinedDate: '2020-09-15T00:00:00.000Z' },
        'u4': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 150, joinedDate: '2020-10-15T00:00:00.000Z' },
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
      haves: [
        { name: 'u1', have: 50 },
      ],
      needs: [
        { name: 'u2', need: 50 },
        { name: 'u3', need: 100 },
      ],
      events: [
        { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
        { type: 'join', name: 'u4', have: 150 }
      ]
    })
  })

  describe('transforming the above examples', function () {
    it('can distribute income evenly with two users', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 },
        ],
        needs: [
          { name: 'u2', need: 2 },
        ],
        events: []
      })
    })

    it('has no effect for adjustment when there are no payments', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('ignores existing payments when not adjusted', function () {
      should(dataToEvents('2020-10', {
        mincomeAmount: 12,
        groupProfiles: {
          'u1': { incomeDetailsType: 'pledgeAmount', pledgeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' },
          'u2': { incomeDetailsType: 'incomeAmount', incomeAmount: 10, joinedDate: '2020-09-15T00:00:00.000Z' }
        }
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: []
      })
    })

    it('takes into account payments from this month when adjusted', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 10 }
        ],
        needs: [
          { name: 'u2', need: 2 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 2 }
        ]
      })
    })

    it('[scenario 1]', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 75 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 75 }
        ]
      })
    })

    it('[scenario 2]', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 50 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 100 }
        ]
      })
    })

    it('[scenario 3] redistributes excess of todo-payments back into other todo-payments', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 300 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 25 }
        ]
      })
    })

    it('[scenario 4] ignores users who updated income after paying and can no longer pay', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 }
        ]
      })
    })

    it('[scenario 4.1] can distribute money from new members', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 50 }
        ],
        needs: [
          { name: 'u2', need: 50 },
          { name: 'u3', need: 100 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u3', amount: 50 },
          { name: 'u4', have: 150, type: 'join' }
        ]
      })
    })

    it('splits money evenly between two pledgers and two needers', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: []
      })
    })

    it('stops asking user to pay someone they fully paid their share to', function () {
      should(dataToEvents('2020-10', {
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
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 }
        ]
      })
    })

    it('does not ask users who have paid their full share to pay any more', function () {
      should(dataToEvents('2020-10', {
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
            'payment2': { amount: 100, exchangeRate: 1, status: 'completed', createdDate: '2020-10-13T00:00:00.000Z' }
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
      })).eql({
        haves: [
          { name: 'u1', have: 250 },
          { name: 'u4', have: 100 }
        ],
        needs: [
          { name: 'u2', need: 100 },
          { name: 'u3', need: 250 }
        ],
        events: [
          { type: 'payment', from: 'u1', to: 'u2', amount: 71.43 },
          { type: 'payment', from: 'u1', to: 'u3', amount: 100 }
        ]
      })
    })
  })
})
