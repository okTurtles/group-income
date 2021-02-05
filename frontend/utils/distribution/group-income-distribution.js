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
   newJSON.groupProfiles[username] = {}
   newJSON.groupProfiles[username].incomeDetailsType = getters.groupProfiles[username].incomeDetailsType
   newJSON.groupProfiles[username].incomeAmount = getters.groupProfiles[username].incomeAmount
   newJSON.groupProfiles[username].pledgeAmount = getters.groupProfiles[username].pledgeAmount
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
 let payments = []
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
 let foldedJSON = {
   profiles: newJSON.groupProfiles,
   payments: payments,
   mincome: mincomeAmount,
   monthstamp: monthstamp,
   adjusted: adjusted
 }
 let new_json = {}
 new_json.mincome = foldedJSON.mincome
 new_json.profiles = {}
 for(const profile in foldedJSON.profiles)
 {
   new_json.profiles[profile] = {}
   if(foldedJSON.profiles[profile].incomeDetailsType === 'pledgeAmount')
     new_json.profiles[profile].have = foldedJSON.profiles[profile].pledgeAmount
   else
     new_json.profiles[profile].need = mincomeAmount - foldedJSON.profiles[profile].incomeAmount
 }
 new_json.payments = []
 for(const payment in foldedJSON.payments)
 {
   const payment_obj = foldedJSON.payments[payment]
   let new_payment = {}
   new_payment[payment_obj.from] = {}
   new_payment[payment_obj.from][payment_obj.to] = payment_obj.amount
   new_json.payments.push(new_payment)
 }
 if(print)
   console.log(JSON.stringify(new_json, null, 2))
   return new_json
}
*/
function distibuteFromHavesToNeeds ({ haves, needs }, { alreadyReceived, alreadySent }, adjusted, totalHave, totalNeed) {
  const pseudoBalances = []
  for (const h of haves) {
    pseudoBalances.push({ name: h.name, balance: h.have - (adjusted && alreadySent[h.name] ? alreadySent[h.name] : 0), percent: h.percent })
  }
  for (const n of needs) {
    pseudoBalances.push({ name: n.name, balance: -n.need + (adjusted && alreadyReceived[n.name] ? alreadyReceived[n.name] : 0), percent: n.percent })
  }

  console.log(pseudoBalances)
  return calculate(pseudoBalances)
  // // const surplus = pseudoBalances.reduce((a, b) => a + b.amount, 0)
  // const payments = []
  // for (const need of needs) {
  //   for (const have of haves) {
  //     const maxTransfer = Math.min(need.need - (adjusted && alreadyReceived[need.name] ? alreadyReceived[need.name] : 0), have.have - (adjusted && alreadySent[have.name] ? alreadySent[have.name] : 0))
  //     const amountByPercentHave = Math.abs(Math.min(have.have * need.percent, maxTransfer))
  //     const amountByPercentNeed = Math.abs(Math.min(need.need * have.percent, maxTransfer))
  //     const amount = Math.max(amountByPercentHave, amountByPercentNeed)
  //     // have.percent -= amount / totalHave
  //     // need.percent -= amount / totalNeed
  //     // totalHave -= amount
  //     // totalNeed -= amount
  //     // if (alreadyReceived[need.name] >= 0) alreadyReceived[need.name] += amount
  //     // if (alreadySent[have.name] >= 0) alreadySent[have.name] += amount
  //     payments.push({ amount, from: have.name, to: need.name })
  //   }
  // }
  // return payments
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
  const totalHave = haves.reduce((a, b) => a + b.have, 0)
  const totalNeed = needs.reduce((a, b) => a + b.need, 0)
  for (const h of haves) h.percent = h.have / totalHave
  for (const n of needs) n.percent = n.need / totalNeed
  // Adjust haves/needs if `adjusted = true`
  const alreadySent = {}
  const alreadyReceived = {}
  const paymentsFromTo = {}
  // let sent = 0
  // let received = 0
  if (adjusted) {
    if (paymentsFrom) {
      for (const fromUser in paymentsFrom) {
        let totalSent = 0
        for (const toUser in paymentsFrom[fromUser]) {
          let totalReceved = 0
          if (!alreadyReceived[toUser]) alreadyReceived[toUser] = 0
          for (const paymentHash of paymentsFrom[fromUser][toUser]) {
            totalReceved += allPayments[paymentHash].data.amount
            if (paymentsFromTo[fromUser]) { // fromUser has made other payments already
              if (paymentsFromTo[fromUser][toUser]) { // fromUser paid toUser already
                paymentsFromTo[fromUser][toUser].amount += allPayments[paymentHash].data.amount // Second partial payment, and beyond
              } else { // First, possibly total, payment
                paymentsFromTo[fromUser][toUser] = {} // Welcome to the party.
                paymentsFromTo[fromUser][toUser].amount = allPayments[paymentHash].data.amount
              }
            } else { // first of fromUser's payments (which goes to toUser)
              paymentsFromTo[fromUser] = {} // A giver (fromUser) has joined...
              paymentsFromTo[fromUser][toUser] = {} // And is giving to toUser
              paymentsFromTo[fromUser][toUser].amount = allPayments[paymentHash].data.amount
            }
          }
          totalSent += totalReceved
          alreadyReceived[toUser] += totalReceved
          // received += totalReceved
        }
        alreadySent[fromUser] = totalSent
        // sent += totalSent
      }
    }
    for (const h of haves) h.percent = (h.have) / (totalHave)
    for (const n of needs) n.percent = (n.need) / (totalNeed)
    // let lowHave = 1E32
    // let highHave = -1E32
    // for (const h of haves) {
    //   lowHave = Math.min(h.percent, lowHave)
    //   highHave = Math.max(h.percent, highHave)
    // }
    // if (highHave - lowHave > 0 && (lowHave < 0 || highHave > 1)) for (const h of haves) h.percent = (h.percent - lowHave) / (highHave - lowHave)
    // let lowNeed = 1E32
    // let highNeed = -1E32
    // for (const n of needs) {
    //   lowNeed = Math.min(n.percent, lowNeed)
    //   highNeed = Math.max(n.percent, highNeed)
    // }
    // if (highNeed - lowNeed > 0 && (lowNeed < 0 || highNeed > 1)) for (const n of needs) n.percent = (n.percent - lowNeed) / (highNeed - lowNeed)
  }
  /// pass the haves and needs to distributeFromHavesToNeeds
  const dist = distibuteFromHavesToNeeds({ haves, needs }, { alreadyReceived, alreadySent }, adjusted, totalHave, totalNeed)

  // const stringArray = dist.map(JSON.stringify);
  // const uniqueSet = new Set(stringArray);
  // const finalDist = Array.from(uniqueSet).map(JSON.parse);

  const finalDist = []

  for (let i = 0; i < dist.length; i++) {
    const first = dist[i]
    for (let j = i + 1; j < dist.length; j++) {
      const second = dist[j]
      if (first.from === second.from && first.to === second.to) {
        first.amount += second.amount
        second.amount = 0
      }
    }
    finalDist.push(first)
  }

  // let lowHave = 1E32
  // let highHave = -1E32
  // for (const h of haves) {
  //   lowHave = Math.min(h.have, lowHave)
  //   highHave = Math.max(h.have, highHave)
  // }
  // let lowNeed = 1E32
  // let highNeed = -1E32
  // for (const n of needs) {
  //   lowNeed = Math.min(n.need, lowNeed)
  //   highNeed = Math.max(n.need, highNeed)
  // }
  // let lowDist = 1E32
  // let highDist = -1E32
  // for (const d of dist) {
  //   lowDist = Math.min(d.amount, lowDist)
  //   highDist = Math.max(d.amount, highDist)
  // }
  // let totalDist = 0
  // for (const d of dist) totalDist += d.amount
  return finalDist.map((payment) => {
    // payment.amount *= Math.min(totalHave - sent, totalDist) / totalDist
    // const sentFromTo = paymentsFromTo[payment.from] && paymentsFromTo[payment.from][payment.to] ? paymentsFromTo[payment.from][payment.to].amount : 0
    // payment.amount = Math.max(payment.amount - sentFromTo, 0)
    return payment
  }).filter((payment) => {
    return payment.amount > 0
  })
}
function getCombinations (arr, n) {
  arr = JSON.parse(JSON.stringify(arr))
  let i; let j; let k; let elem; const l = arr.length; let childperm; const ret = []
  if (n === 1) {
    for (i = 0; i < arr.length; i++) {
      for (j = 0; j < arr[i].length; j++) {
        ret.push([arr[i][j]])
      }
    }
    return ret
  } else {
    for (i = 0; i < l; i++) {
      elem = arr.shift()
      for (j = 0; j < elem.length; j++) {
        childperm = getCombinations(arr.slice(), n - 1)
        for (k = 0; k < childperm.length; k++) {
          ret.push([elem[j]].concat(childperm[k]))
        }
      }
    }
    return ret
  }
}

// package cz . destil . settleup . utils ;
// import java . util . Collections ;
// import java . util . Comparator ;
// import java . util . HashMap ;
// import java . util . Iterator ;
// import java . util . LinkedList ;
// import java . util . List ;
// import cz . destil . settleup . data . Member ;
/**
* Debt calculator - calculates who should pay how much to who with optional
* tolerance value.
*
* @author Ian Wesson
*
*/
// const MAX_MEMBERS_FOR_OPTIMAL = 15
/**
* Main algorithm , calculates who should send how much to who It optimizes
* basic algorithm
*
* @param members
* List of members with their credit and debts
* @param tolerance
* Money value nobody cares about
* @return List of Hashmaps encoding transactions
*/
function calculate (members, tolerance = 1E-24) {
  // tolerance += 0.009 // increasing tolerance due to double precision
  const results = []
  const validMembers = []

  // remove members where debts are too small (1 - pairs )
  for (const m of members) {
    if (Math.abs(m.balance) > tolerance) {
      validMembers.push(m)
    }
  }
  // safety check
  if (validMembers.length === 1) { return results }
  // for 18 and more members alghoritm would take long time , so using just
  // basic alghoritm
  // if ( validMembers.length <= MAX_MEMBERS_FOR_OPTIMAL )

  // find n-pairs , starting at 2 -pairs , deal with them using basic
  // algorithm and remove them
  let n = 2
  while (n < validMembers.length - 1) {
    const combinations = getCombinations(validMembers, n)
    let nPairFound = false
    for (const combination of combinations) {
      let sum = 0
      for (let i = 0; i < combination.length; i++) {
        sum += validMembers.get(combination[i]).balance
      }
      if (Math.abs(sum) <= tolerance) {
        // found n- pair - deal with them
        const pairedValidMembers = []
        for (let i = 0; i < combination.length; i++) {
          pairedValidMembers.add(validMembers.get(combination[i]))
        }
        const values = basicDebts(pairedValidMembers, tolerance)
        results.addAll(values)
        validMembers.removeAll(pairedValidMembers)
        nPairFound = true
      }
      if (nPairFound) break
    }
    if (!nPairFound) n++
  }
  // deal with what is left after removing n- pairs
  const values = basicDebts(validMembers, tolerance)
  const finalResults = []
  for (const r of results) { finalResults.push(r) }
  for (const v of values) { finalResults.push(v) }
  return finalResults
}
/**
* Not - optimal debts algorithm - it calculates debts with N -1 transactions
*
* @param members
* List of members with their credit and debts
* @param tolerance
* Money value nobody cares about
* @return List of Hashmaps encoding transactions
*/
function basicDebts (members, tolerance) {
  console.log(members)
  const debts = []
  let resolvedMembers = 0
  while (resolvedMembers !== members.length) {
    // transaction is from lowes balance to highest balance
    members = members.sort((a, b) => {
      return b.balance - a.balance
    })
    const sender = members[0]
    const recipient = members[members.length - 1]

    if (sender.balance < 0 && recipient.balance < 0) {
      resolvedMembers++
      continue
    }

    const senderShouldSend = Math.min(Math.abs(sender.balance * recipient.percent), Math.abs(sender.balance * sender.percent))
    const recipientShouldReceive = Math.min(Math.abs(recipient.balance * sender.percent), Math.abs(recipient.balance * recipient.percent))

    let amount = 0
    if (senderShouldSend > recipientShouldReceive) {
      amount = recipientShouldReceive
    } else {
      amount = senderShouldSend
    }
    sender.balance -= amount
    recipient.balance += amount
    // create transaction
    const values = {}
    values.from = sender.name
    values.to = recipient.name
    values.amount = amount
    debts.push(values)
    console.log(values)
    // delete members who are settled
    const senderShouldSendAdjusted = Math.abs(sender.balance)
    const recipientShouldReceiveAdjusted = Math.abs(recipient.balance)

    if (senderShouldSendAdjusted <= tolerance) { resolvedMembers++ }
    if (recipientShouldReceiveAdjusted <= tolerance) { resolvedMembers++ }
  }
  // limit transactions by tolerance
  const finalPayments = []
  for (const debt of debts) {
    if (debt.amount > tolerance) { finalPayments.push(debt) }
  }
  return finalPayments
}
