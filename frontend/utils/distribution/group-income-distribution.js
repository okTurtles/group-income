import { saferFloat } from '~/frontend/views/utils/currencies.js'
import incomeDistribution from '~/frontend/utils/distribution/mincome-proportional.js'
import { remapObject } from '~/frontend/utils/giLodash.js'
import { ISOStringToMonthstamp } from '~/frontend/utils/time.js'

function adjustIncome (to, income, adjustWith) {
  if (!adjustWith) return income
  const month = adjustWith.monthlyPayments[adjustWith.monthstamp]
  if (!month) return income

  const totalReceived = (Object.values(month.paymentsFrom)
    .flatMap(toMap => (toMap[to] || []).map(paymentName =>
      adjustWith.payments[paymentName].amount))
    .reduce((a, b) => a + b, 0))

  return income + totalReceived
}

function adjustedPledge (from, pledge, adjustWith) {
  if (!adjustWith) return pledge
  const month = adjustWith.monthlyPayments[adjustWith.monthstamp]
  if (!month) return pledge

  const totalSent = (Object.values(month.paymentsFrom[from] || {})
    // TODO: check payment.status maybe? (might not matter)
    // TODO: deal with payment.exchangeRate?
    // TODO: deal with mincomeExchangeRate?
    // Check paymentTotalFromUserToUser for details
    .map(paymentName => adjustWith.payments[paymentName].amount)
    .reduce((a, b) => a + b, 0))

  return Math.max(0, pledge - totalSent)
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
        ? adjustIncome(name, profile.incomeAmount, adjustWith)
        : adjustedPledge(name, profile.pledgeAmount, adjustWith) + mincomeAmount)
      return { name, amount }
    }))

  return incomeDistribution(currentIncomeDistribution, mincomeAmount)
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
