import { saferFloat } from '~/frontend/views/utils/currencies.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import { mapValues } from '~/frontend/utils/giLodash.js'
import paymentTotalFromUserToUser from '../../model/contracts/payments/totals.js'

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
    .filter(([, profile]) => profile.joinedDate.startsWith(monthstamp))
    .map(mapUser({ withDate: true }))
    .map(user => { user.type = 'join'; return user }))

  const events = (paymentEvents
    .concat(joinEvents)
    .sort((a, b) => a.date < b.date ? -1 : 1)
    .map(event => { delete event.date; return event }))

  const members = (Object.entries(data.groupProfiles)
    .filter(([, profile]) => profile.joinedDate < monthstamp)
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

function distibuteFromHavesToNeeds({ haves, needs }) {
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

// Note: this mutates the objects in haves/needs
export function groupIncomeDistributionNewLogic ({ haves, needs, events }) {
  let payments = distibuteFromHavesToNeeds({ haves, needs })

  for (const event of events) {
    if (event.type === 'payment') {
      const { from, to, amount } = event

      payments.find(p => p.from === from && p.to === to).amount -= amount
      haves.find(u => u.name === from).have -= amount
    }
    else if (event.type === 'join') {
      const { name, have, need } = event
      let newPayments

      if (have !== undefined) {
        newPayments = distibuteFromHavesToNeeds({ needs, haves: [{ name, have }] })
      }
      else {
        needs.push({ name, need })
        newPayments = distibuteFromHavesToNeeds({ needs, haves })
      }

      payments = payments.concat(newPayments)
    }
  }

  return payments.filter(payment => Number(payment.amount.toFixed(12)) !== 0)
}

export function groupIncomeDistributionLogic ({
  mincomeAmount,
  groupProfiles,
  adjustWith
}) {
  const currentIncomeDistribution = (Object.entries(groupProfiles)
    // filter out users without a profile or without income details
    .filter(([name, profile]) => profile && profile.incomeDetailsType)
    // get the user's absolute income by adding pledge if needed
    .map(([name, profile]) => {
      const amount = saferFloat(profile.incomeDetailsType === 'incomeAmount'
        ? profile.incomeAmount
        : profile.pledgeAmount + mincomeAmount)
      return { name, amount }
    }))

  let dist = incomeDistribution(currentIncomeDistribution, mincomeAmount)

  if (adjustWith) {
    const { monthstamp, payments, monthlyPayments } = adjustWith

    // if this user has already made some payments to other users this
    // month, we need to take that into account and adjust the distribution.
    // this will be used by the Payments page to tell how much still
    // needs to be paid (if it was a partial payment).
    const carried = Object.create(null)
    for (const p of dist) {
      const alreadyPaid = paymentTotalFromUserToUser({
        fromUser: p.from,
        toUser: p.to,
        paymentMonthstamp: monthstamp,
        payments,
        monthlyPayments
      })

      const carryAmount = p.amount - alreadyPaid
      // ex: it wants us to pay $2, but we already paid $3, thus: carryAmount = -$1 (all done paying)
      // ex: it wants us to pay $3, but we already paid $2, thus: carryAmount = $1 (remaining to pay)
      // if we "overpaid" because we sent late payments, remove us from consideration
      p.amount = saferFloat(Math.max(0, carryAmount))
      // calculate our carried adjustment (used when distribution changes due to new users)
      if (!carried[p.from]) carried[p.from] = { carry: 0, total: 0 }
      carried[p.from].total += p.amount
      if (carryAmount < 0) carried[p.from].carry += -carryAmount
    }
    // we loop through and proportionally subtract the amount that we've already paid
    dist = dist.filter(p => p.amount > 0)
    for (const p of dist) {
      const c = carried[p.from]
      p.amount = saferFloat(p.amount - (c.carry * p.amount / c.total))
    }
    // console.debug('adjustedDist', adjustedDist, 'carried', carried)
  }

  dist = dist.filter(p => p.amount !== 0)

  return dist
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
