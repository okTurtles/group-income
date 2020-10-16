import { saferFloat } from '~/frontend/views/utils/currencies.js'
import { PAYMENT_COMPLETED } from './index.js'

export default function paymentTotalFromUserToUser ({
  fromUser,
  toUser,
  paymentMonthstamp,
  payments,
  monthlyPayments
}) {
  const { paymentsFrom, mincomeExchangeRate } = monthlyPayments[paymentMonthstamp] || {}
  // NOTE: @babel/plugin-proposal-optional-chaining would come in super-handy
  //       here, but I couldn't get it to work with our linter. :(
  //       https://github.com/babel/babel-eslint/issues/511
  const total = (((paymentsFrom || {})[fromUser] || {})[toUser] || []).reduce((a, hash) => {
    var { amount, exchangeRate, status, creationMonthstamp } = payments[hash]
    if (status !== PAYMENT_COMPLETED) {
      return a
    }
    // if this payment is from a previous month, then make sure to take into account
    // any proposals that passed in between the payment creation and the payment
    // completion that modified the group currency by multiplying both month's
    // exchange rates
    if (paymentMonthstamp !== creationMonthstamp) {
      exchangeRate *= monthlyPayments[creationMonthstamp].mincomeExchangeRate
    }
    return a + (amount * exchangeRate * mincomeExchangeRate)
  }, 0)
  return saferFloat(total)
}

/*

What we needed from currentGroupState:

getters.currentGroupState.payments = {
x  "21XWnNXCLQNhXP7RP4oDJyMw7ZjZCvVsjZfRS9vADjWWd6Fse6": {
    "data": {
      "toUser": "u2",
x      "amount": 2,
      "total": 2,
      "partial": false,
      "currencyFromTo": [
        "USD",
        "USD"
      ],
      "groupMincome": 12,
x      "exchangeRate": 1,
      "txid": "0.6792441849295523",
x      "status": "completed",
      "paymentType": "manual",
      "memo": "hey bud",
      "completedDate": "2020-10-16T18:58:58.207Z"
    },
    "meta": {
x      "createdDate": "2020-10-16T18:58:58.169Z",
      "username": "u1",
      "identityContractID": "21XWnNKFgXGSigVTkZ9iAmD4X1dbhvxyFPDY9nTEkWtfW6QgaU"
    },
    "history": [
      [
        "2020-10-16T18:58:58.169Z",
        "21XWnNXCLQNhXP7RP4oDJyMw7ZjZCvVsjZfRS9vADjWWd6Fse6"
      ],
      [
        "2020-10-16T18:58:58.207Z",
        "21XWnNF1t9EeXbiJX3FAdpFAY3GsY47zSKLSeokEnHn2xXCwc2"
      ]
    ]
  }
}

getters.currentGroupState.paymentsByMonth = {
  "2020-10": {
    "firstMonthsCurrency": "USD",
x    "mincomeExchangeRate": 1,
x    "paymentsFrom": {
      "u1": {
        "u2": [
          "21XWnNXCLQNhXP7RP4oDJyMw7ZjZCvVsjZfRS9vADjWWd6Fse6"
        ]
      }
    },
    "lastAdjustedDistribution": [
      {
        "amount": 2,
        "from": "u1",
        "to": "u2"
      }
    ]
  }
}

What this function gets after the caller transforms it:

{
  "21XWnNXCLQNhXP7RP4oDJyMw7ZjZCvVsjZfRS9vADjWWd6Fse6": {
    "amount": 2,
    "exchangeRate": 1,
    "status": "completed",
    "createdDate": "2020-10-16T18:58:58.169Z"
  }
}

{
  "2020-10": {
    "mincomeExchangeRate": 1,
    "paymentsFrom": {
      "u1": {
        "u2": [
          "21XWnNXCLQNhXP7RP4oDJyMw7ZjZCvVsjZfRS9vADjWWd6Fse6"
        ]
      }
    }
  }
}

Types would have really helped here.

*/
