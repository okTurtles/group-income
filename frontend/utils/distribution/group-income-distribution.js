import { saferFloat } from '~/frontend/views/utils/currencies.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import paymentTotalFromUserToUser from '~/frontend/model/contracts/payments/totals.js'
import { remapObject } from '~/frontend/utils/giLodash.js'
import { ISOStringToMonthstamp } from '~/frontend/utils/time.js'

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

  return dist
}

export default function groupIncomeDistribution ({ getters, monthstamp, adjusted }) {
  return groupIncomeDistributionLogic({
    mincomeAmount: getters.groupMincomeAmount,
    groupProfiles: remapObject(getters.groupProfiles, (profile) => ({
      incomeDetailsType: profile.incomeDetailsType,
      pledgeAmount: profile.pledgeAmount,
      incomeAmount: profile.incomeAmount
    })),
    adjustWith: adjusted && {
      monthstamp,
      payments: remapObject(getters.currentGroupState.payments, (payment) => ({
        amount: payment.data.amount,
        exchangeRate: payment.data.exchangeRate,
        status: payment.data.status,
        creationMonthstamp: ISOStringToMonthstamp(payment.meta.createdDate)
      })),
      monthlyPayments: remapObject(getters.currentGroupState.paymentsByMonth, (payments) => ({
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
