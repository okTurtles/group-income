import { mapValues } from '~/frontend/utils/giLodash.js'
import { saferFloat } from '~/frontend/views/utils/currencies.js'

export function dataToEvents (monthstamp, data) {
  const mapUser = ({ withDate }) => ([name, profile]) => ({
    name,
    ...(withDate && { date: profile.joinedDate }),
    ...(profile.incomeDetailsType === 'pledgeAmount'
      ? { have: profile.pledgeAmount }
      : { need: data.mincomeAmount - profile.incomeAmount })
  })

  const paymentEvents = []
  if (data.adjustWith) {
    const thisMonth = data.adjustWith.monthlyPayments[monthstamp]
    if (thisMonth) {
      for (const [from, toPayments] of Object.entries(thisMonth.paymentsFrom)) {
        for (const [to, payments] of Object.entries(toPayments)) {
          for (const paymentName of payments) {
            const payment = data.adjustWith.payments[paymentName]
            const amount = payment.amount * payment.exchangeRate * thisMonth.mincomeExchangeRate
            const date = payment.createdDate
            paymentEvents.push({ type: 'payment', from, to, amount, date })
          }
        }
      }
    }
  }

  const joinEvents = (Object.entries(data.groupProfiles)
    .filter(([, profile]) => monthstamp ? profile.joinedDate.startsWith(monthstamp) : true)
    .map(mapUser({ withDate: true }))
    .map(user => { user.type = 'join'; return user }))

  const events = (paymentEvents
    .concat(joinEvents)
    .sort((a, b) => a.date < b.date ? -1 : 1)
    .map(event => { delete event.date; return event }))

  const members = (Object.entries(data.groupProfiles)
    .filter(([, profile]) => monthstamp ? profile.joinedDate < monthstamp : true)
    .map(mapUser({ withDate: false })))

  return {
    haves: members.filter(user => user.have !== undefined && user.have > 0),
    needs: members.filter(user => user.need !== undefined),
    events
  }
}

/*
JS is giving us 20 * (10 / 18) * (18 / 50) = 3.9999999999999996 instead of 4
*/

function distibuteFromHavesToNeeds ({ haves, needs }) {
  const totalHave = haves.reduce((a, b) => a + b.have, 0)
  const totalNeed = needs.reduce((a, b) => a + b.need, 0)
  const totalPercent = Math.min(1, totalHave / totalNeed)

  for (const have of haves) have.percent = have.have / totalHave

  const payments = []
  for (const need of needs) {
    for (const have of haves) {
      const amount = need.need * have.percent * totalPercent
      need.need -= amount
      payments.push({ amount, from: have.name, to: need.name })
    }
  }
  return payments
}
export function groupIncomeDistributionAdjustFirstLogic ({
  haves,
  needs,
  events
}) {
  //  Adjustment-First Approach:
  //  STEP #1: Pledges and needs should be adjusted (before being done proportionally) every time a any payment is made.
  //  STEP #2: Get a list of payments for every user who is pledging for the month.
  //  STEP #3: Clone the haves/needs (pledges/incomes).
  //  STEP #4: Adjust haves/needs of the clone based on existing payments.
  //  STEP #5: Pass new haves/needs to distribution logic & this becomes the new TODO list!
  let payments = distibuteFromHavesToNeeds({ haves, needs })

  for (const event of events) {
    //  For every payment event, subtract payment amount from haves and add it to needs, proportionally.
    if (event.type === 'payment') {
      const { from, to, amount } = event

      payments.find(p => p.from === from && p.to === to).amount -= amount
      haves.find(u => u.name === from).have -= amount
    } else if (event.type === 'join') {
      const { name, have, need } = event
      let newPayments

      if (have !== undefined) {
        newPayments = distibuteFromHavesToNeeds({ needs, haves: [{ name, have }] })
      } else {
        needs.push({ name, need })
        newPayments = distibuteFromHavesToNeeds({ needs, haves })
      }

      payments = payments.concat(newPayments)
    }
  }

  return payments.filter(payment => Number(payment.amount.toFixed(12)) !== 0)
}

export function groupIncomeDistributionAdjustFirstLogic ({
  haves,
  needs,
  events
}) {
  //  Adjustment-First Approach:
  //  STEP #1: Pledges and needs should be adjusted (before being done proportionally) every time a any payment is made.
  //  STEP #2: Get a list of payments for every user who is pledging for the month.
  //  STEP #3: Clone the haves/needs (pledges/incomes).
  //  STEP #4: Adjust haves/needs of the clone based on existing payments.
  //  STEP #5: Pass new haves/needs to distribution logic & this becomes the new TODO list!
  let pledgers = events.filter((e)=>e.type=='payment').map((e)=>e.from)

  let payments = distibuteFromHavesToNeeds({ haves, needs })

  for (const event of events) {
    if (event.type === 'payment') {
      const { from, to, amount } = event

      payments.find(p => p.from === from && p.to === to).amount -= amount
      haves.find(u => u.name === from).have -= amount
    } else if (event.type === 'join') {
      const { name, have, need } = event
      let newPayments

      if (have !== undefined) {
        newPayments = distibuteFromHavesToNeeds({ needs, haves: [{ name, have }] })
      } else {
        needs.push({ name, need })
        newPayments = distibuteFromHavesToNeeds({ needs, haves })
      }

      payments = payments.concat(newPayments)
    }
  }

  const dist = payments.filter(payment => Number(payment.amount.toFixed(12)) !== 0)

  //  Remove duplicate results...

  var finalDist = []
  dist.map((payment) => {
    const paymentStringified = JSON.stringify(payment)
    var foundPayment = false
    for (var finalPayment in finalDist) {
      if (JSON.stringify(finalDist[finalPayment]) === paymentStringified) {
        foundPayment = true
      }
    }
    if (!foundPayment) {
      finalDist.push(payment)
    }
  })

  // Balance negative and positive payments.
  const positive = finalDist.filter((payment) => payment.amount >= 0)
  const negative = finalDist.filter((payment) => payment.amount < 0)

  const overPaymentTotal = (negative.length === 0 ? 0 : negative.reduce((totalOverPayments, overPayment) => totalOverPayments + overPayment.amount, 0))

  finalDist = positive.map(function (payment) {
    payment.amount += this
    payment.amount = saferFloat(payment.amount)
    return payment
  }.bind(overPaymentTotal))
  // Remove pending payments of zero before returning.
  return finalDist.filter((payment) => payment.amount > 0)
}

// Note: this mutates the objects in haves/needs
export function groupIncomeDistributionNewLogic ({ haves, needs, events }) {
  let payments = distibuteFromHavesToNeeds({ haves, needs })

  for (const event of events) {
    if (event.type === 'payment') {
      const { from, to, amount } = event

      payments.find(p => p.from === from && p.to === to).amount -= amount
      haves.find(u => u.name === from).have -= amount
    } else if (event.type === 'join') {
      const { name, have, need } = event
      let newPayments

      if (have !== undefined) {
        newPayments = distibuteFromHavesToNeeds({ needs, haves: [{ name, have }] })
      } else {
        needs.push({ name, need })
        newPayments = distibuteFromHavesToNeeds({ needs, haves })
      }

      payments = payments.concat(newPayments)
    }
  }

  const dist = payments.filter(payment => Number(payment.amount.toFixed(12)) !== 0)

  //  Remove duplicate results...

  var finalDist = []
  dist.map((payment) => {
    const paymentStringified = JSON.stringify(payment)
    var foundPayment = false
    for (var finalPayment in finalDist) {
      if (JSON.stringify(finalDist[finalPayment]) === paymentStringified) {
        foundPayment = true
      }
    }
    if (!foundPayment) {
      finalDist.push(payment)
    }
  })

  // Balance negative and positive payments.
  const positive = finalDist.filter((payment) => payment.amount >= 0)
  const negative = finalDist.filter((payment) => payment.amount < 0)

  const overPaymentTotal = (negative.length === 0 ? 0 : negative.reduce((totalOverPayments, overPayment) => totalOverPayments + overPayment.amount, 0))

  finalDist = positive.map(function (payment) {
    payment.amount += this
    payment.amount = saferFloat(payment.amount)
    return payment
  }.bind(overPaymentTotal))
  // Remove pending payments of zero before returning.
  return finalDist.filter((payment) => payment.amount > 0)
}

export function groupIncomeDistributionLogic (data) {
  return groupIncomeDistributionNewLogic(dataToEvents(data.adjustWith ? data.adjustWith.monthstamp : null, data))
}

export default function groupIncomeDistribution ({ getters, monthstamp, adjusted }) {
  return groupIncomeDistributionLogic({
    mincomeAmount: getters.groupMincomeAmount,
    groupProfiles: mapValues(getters.groupProfiles, (profile) => ({
      joinedDate: profile.joinedDate,
      incomeDetailsType: profile.incomeDetailsType,
      pledgeAmount: profile.pledgeAmount,
      incomeAmount: profile.incomeAmount
    })),
    adjustWith: adjusted && {
      monthstamp,
      payments: mapValues(getters.currentGroupState.payments, (payment) => ({
        amount: payment.data.amount,
        exchangeRate: payment.data.exchangeRate,
        status: payment.data.status,
        createdDate: payment.meta.createdDate
      })),
      monthlyPayments: mapValues(getters.currentGroupState.paymentsByMonth, (payments) => ({
        mincomeExchangeRate: payments.mincomeExchangeRate,
        paymentsFrom: payments.paymentsFrom
      }))
    }
  })
}

/*

groupMincomeAmount = 12

groupProfiles = {
  "u1": {
    "globalUsername": "",
    "contractID": "21XWnNKFgXGSigVTkZ9iAmD4X1dbhvxyFPDY9nTEkWtfW6QgaU",
    "joinedDate": "2020-10-16T18:57:24.277Z",
    "nonMonetaryContributions": [],
    "status": "active",
    "departedDate": null,
    "incomeDetailsType": "pledgeAmount",
    "pledgeAmount": 10,
    "paymentMethods": []
  },
  "u2": {
    "globalUsername": "",
    "contractID": "21XWnNK5sQHid4iJwSVEPqbrEpckRaT2zNwcHwXnjzYbBbUAmU",
    "joinedDate": "2020-10-16T18:57:33.867Z",
    "nonMonetaryContributions": [],
    "status": "active",
    "departedDate": null,
    "incomeDetailsType": "incomeAmount",
    "incomeAmount": 10,
    "paymentMethods": []
  }
}

What we actually use:

{
  "u1": {
    "incomeDetailsType": "pledgeAmount",
    "pledgeAmount": 10,
  },
  "u2": {
    "incomeDetailsType": "incomeAmount",
    "incomeAmount": 10,
  }
}

*/
