/*
// Useful for creating mocha tests in conjunction with
// unfoldParameters in the accompanying *.test.js
function foldParameters({getters, monthstamp, adjusted}, print = false)
{
  // "Cherrypick" the JSON so it is easier to read.
  let newJSON = {}
  newJSON.groupProfiles = {}
  newJSON.currentGroupState = {}
  newJSON.monthlyPayments = {}
  for (const username in getters.groupProfiles) {
    newJSON.groupProfiles[username] = {};
    newJSON.groupProfiles[username].incomeDetailsType = getters.groupProfiles[username].incomeDetailsType;
    newJSON.groupProfiles[username].incomeAmount = getters.groupProfiles[username].incomeAmount;
    newJSON.groupProfiles[username].pledgeAmount = getters.groupProfiles[username].pledgeAmount;
  }

  newJSON.monthlyPayments = {}
  newJSON.monthlyPayments[monthstamp] = {}
  newJSON.monthlyPayments[monthstamp].paymentsFrom = {}

  newJSON.groupSettings = {}
  newJSON.groupSettings.mincomeAmount = getters.groupSettings.mincomeAmount

  newJSON.currentGroupState = {}
  newJSON.currentGroupState.payments = {}

  let payment = 0
  for (const fromUser in getters.monthlyPayments[monthstamp].paymentsFrom) {
    newJSON.monthlyPayments[monthstamp].paymentsFrom[fromUser] = {}
    for (const toUser in getters.monthlyPayments[monthstamp].paymentsFrom[fromUser]) {
      newJSON.monthlyPayments[monthstamp].paymentsFrom[fromUser][toUser] = []
      for (const paymentHash of getters.monthlyPayments[monthstamp].paymentsFrom[fromUser][toUser]) {
        payment++
        const theHash = "paymentHsh"+payment//paymentHash)
        newJSON.monthlyPayments[monthstamp].paymentsFrom[fromUser][toUser].push(theHash)
        newJSON.currentGroupState.payments[theHash] = {}
        newJSON.currentGroupState.payments[theHash].data = {}
        newJSON.currentGroupState.payments[theHash].data.amount = getters.currentGroupState.payments[paymentHash].data.amount
      }
    }
  }

  // console.log(JSON.stringify(newJSON, null, 2))
  // "Fold" the JSON so it is easier to read.
  let payments = [];
  if (paymentsFrom) {
    for (const fromUser in paymentsFrom) {
      for (const toUser in paymentsFrom[fromUser]) {
        for (const paymentHash of paymentsFrom[fromUser][toUser]) {
          payments.push({from:fromUser, to: toUser,
            amount:allPayments[paymentHash].data.amount})
        }
      }
    }
  }
  var foldedJSON = {
    profiles: newJSON.groupProfiles,
    payments: payments,
    mincome: mincomeAmount,
    monthstamp: monthstamp,
    adjusted: adjusted
  }
  var new_json = {}
  new_json.mincome = foldedJSON.mincome
  new_json.profiles = {}
  for(const profile in foldedJSON.profiles)
  {
    new_json.profiles[profile] = {}
    if(foldedJSON.profiles[profile].incomeDetailsType == 'pledgeAmount')
      new_json.profiles[profile].have = foldedJSON.profiles[profile].pledgeAmount
    else
      new_json.profiles[profile].need = mincomeAmount - foldedJSON.profiles[profile].incomeAmount
  }

  new_json.payments = [];

  for(const payment in foldedJSON.payments)
  {
    const payment_obj = foldedJSON.payments[payment]
    var new_payment = {}

    new_payment[payment_obj.from] = {}
    new_payment[payment_obj.from][payment_obj.to] = payment_obj.amount

    new_json.payments.push(new_payment)
  }

  if(print)
    console.log(JSON.stringify(new_json, null, 2))

    return new_json
}
*/

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
export default function groupIncomeDistribution ({ getters, monthstamp, adjusted }) {
  const groupProfiles = getters.groupProfiles
  const mincomeAmount = getters.groupSettings.mincomeAmount
  const allPayments = getters.currentGroupState.payments
  const thisMonthPayments = getters.groupMonthlyPayments ? getters.groupMonthlyPayments[monthstamp] : null
  const paymentsFrom = thisMonthPayments && thisMonthPayments.paymentsFrom

  const haves = []
  const needs = []
  // calculate haves and needs from pledges and incomes:
  for (const username in groupProfiles) {
    const profile = groupProfiles[username]
    const incomeDetailsType = profile && profile.incomeDetailsType
    if (incomeDetailsType === 'incomeAmount') {
      needs.push({ name: username, need: mincomeAmount - profile.incomeAmount })
    } else if (incomeDetailsType === 'pledgeAmount') {
      haves.push({ name: username, have: profile.pledgeAmount })
    }
    haves.percent = 0
  }
  /// Adjust haves/needs if `adjusted = true`
  if (adjusted) {
    const alreadySent = {}
    const alreadyReceived = {}
    if (paymentsFrom) {
      for (const fromUser in paymentsFrom) {
        let totalSent = 0
        for (const toUser in paymentsFrom[fromUser]) {
          let totalReceved = 0
          if (!alreadyReceived[toUser]) alreadyReceived[toUser] = 0
          for (const paymentHash of paymentsFrom[fromUser][toUser]) {
            totalReceved += allPayments[paymentHash].data.amount
          }
          totalSent += totalReceved
          alreadyReceived[toUser] += totalReceved
        }
        alreadySent[fromUser] = totalSent
      }
      for (const have of haves) {
        have.have -= alreadySent[have.name] ? alreadySent[have.name] : 0
      }
      for (const need of needs) {
        need.need -= alreadyReceived[need.name] ? alreadyReceived[need.name] : 0
      }
    }
  }
  /// pass the haves and needs to distributeFromHavesToNeeds
  const dist = distibuteFromHavesToNeeds({ haves, needs }).filter((payment) => {
    return payment.amount > 0
  })
  return dist
}
