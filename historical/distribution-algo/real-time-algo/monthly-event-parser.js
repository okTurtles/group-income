'use strict'

import { lastDayOfMonth, dateFromMonthstamp, dateToMonthstamp } from '~/frontend/utils/time.js'
import { cloneDeep } from '~/frontend/utils/giLodash.js'
import { saferFloat, DECIMALS_MAX } from '~/frontend/views/utils/currencies.js'
import mincomeProportional from './mincome-proportional.js'
import minimizeTotalPaymentsCount from './payments-minimizer.js'

type Distribution = Array<Object>;

// Merges multiple payments between any combinations two of users:
function reduceDistribution (payments: Distribution): Distribution {
  // Don't modify the payments list/object parameter in-place, as this is not intended:
  payments = cloneDeep(payments)
  for (let i = 0; i < payments.length; i++) {
    const paymentA = payments[i]
    for (let j = i + 1; j < payments.length; j++) {
      const paymentB = payments[j]

      // Were paymentA and paymentB between the same two users?
      if ((paymentA.from === paymentB.from && paymentA.to === paymentB.to) ||
        (paymentA.to === paymentB.from && paymentA.from === paymentB.to)) {
        // Add or subtract paymentB's amount to paymentA's amount, depending on the relative
        // direction of the two payments:
        paymentA.amount += (paymentA.from === paymentB.from ? 1 : -1) * paymentB.amount
        if (!paymentA.totalLocked && !paymentB.totalLocked) {
          paymentA.total += (paymentA.from === paymentB.from ? 1 : -1) * paymentB.total
        }
        // Remove paymentB from payments, and decrement the inner sentinal loop variable:
        payments.splice(j, 1)
        j--
      }
    }
  }
  return payments
}

function addDistributions (paymentsA: Distribution, paymentsB: Distribution): Distribution {
  return reduceDistribution([...paymentsA, ...paymentsB])
}

function subtractDistributions (paymentsA: Distribution, paymentsB: Distribution): Distribution {
  // Don't modify any payment list/objects parameters in-place, as this is not intended:
  paymentsB = cloneDeep(paymentsB)
  // Reverse the sign of the second operand's amounts so that the final addition is actually subtraction:
  for (const p of paymentsB) {
    p.amount *= -1
    p.total *= -1
  }
  return addDistributions(paymentsA, paymentsB)
}

// This algorithm is responsible for calculating the monthly-rated distribution of
// payments.
function parsedistributionFromEvents (
  distributionEvents: Distribution,
  opts: Object
): Distribution {
  const distributionEventsCopy = cloneDeep(distributionEvents)

  const groupMembers = []
  let payments = []
  const { adjusted, minimizeTxns } = opts

  // Convenience function for retreiving a user by name:
  const getUser = (name) => groupMembers.find(member => member.name === name)

  const eventHandlers = {
    haveNeedEvent (event) {
      const oldUser = getUser(event.data.name)
      if (oldUser) {
        const oldHaveNeed = oldUser.haveNeed
        oldUser.haveNeed = event.data.haveNeed
        oldUser.oldHaveNeed = oldHaveNeed
      } else {
        groupMembers.push({
          name: event.data.name,
          haveNeed: event.data.haveNeed
        })
      }
    },
    paymentEvent (event) {
      payments.push({
        from: event.data.from,
        to: event.data.to,
        amount: event.data.amount,
        total: 0,
        dueOn: '',
        isLate: !!event.data.isLate,
        partial: false
      })
    },
    userExitsGroupEvent (event) {
      const idx = groupMembers.findIndex(v => v.name === event.data.name)
      if (idx === -1) throw new Error(`userExitsGroupEvent: no such user: ${event.data.name}`)
      groupMembers.splice(idx, 1)
    }
    // TODO: if we decide to handle latePayments as part of the distribution
    //       events, then add a dummy function here that does nothing for latePaymentEvents
    //       and handle the events separately down below (see other TODO at end of function)
  }

  // handle all events, filling out payments and groupMembers arrays
  let prevDistEvent
  let sequence = []
  const distributionSequences = [sequence]
  while (distributionEventsCopy.length > 0) {
    const event = distributionEventsCopy.shift()
    if (prevDistEvent === 'paymentEvent' && event.type !== 'paymentEvent') {
      sequence = [event]
      distributionSequences.push(sequence)
    } else {
      sequence.push(event)
    }
    prevDistEvent = event.type
  }
  const reduceField = (field, dir, name, dist) => {
    return dist.reduce((a, p) => {
      return p[dir] === name ? a + p[field] : a
    }, 0)
  }
  const ensureTotalSet = (dist) => {
    for (const todo of dist) {
      todo.total = todo.amount
    }
    return dist
  }
  const todoExistsInDistribution = (todo, dist) => {
    for (const oldTodo of dist) {
      if (oldTodo.from === todo.from && oldTodo.to === todo.to) {
        return true
      }
    }
  }
  const lockTodos = (dist) => {
    for (const todo of dist) {
      if (todo.amount !== todo.total) {
        todo.totalLocked = true
        // this is a kind of hack for dealing with certain minimization scenarios
        // where the amount we paid results in a negative value for the unminimized
        // but adjusted distribution
        if (todo.amount < 0) {
          todo.total -= todo.amount
          // todo.amount = 0
        }
      }
    }
    return dist
  }
  // Principles:
  // 1. Once a payment is made, the .total between those two users is set for life
  // 2. mincomeProportional should be re-applied to the remainer of the haveNeeds,
  //    subtracting the .total from them, and redistributing todos between any parties
  //    that already have payments between them to other todos, and then concattenating
  //    that todo list with the previous todo list, and then subtracting any new
  //    payments
  let distribution = []
  let prevPayments = []
  // for (const sequence of distributionSequences) {
  for (let i = 0; i < distributionSequences.length; i++) {
    const sequence = distributionSequences[i]
    // console.log('\n======= LOOP!!! Sequence:', sequence, '\n')
    payments = []
    for (const event of sequence) {
      eventHandlers[event.type](event)
    }
    if (distribution.length === 0) {
      distribution = ensureTotalSet(mincomeProportional(groupMembers))
    }
    if (adjusted) {
      const reserves = cloneDeep(groupMembers)
      const lockedTodos = distribution.filter(todo => todo.totalLocked)
      // if we wanted to handle partial payments + haveNeed changes, it would go here
      // and it would look something like this:
      // // loop through reserves to find those with modified haveNeeds
      // // remember to delete groupMember.oldHaveNeed afterward
      // for (const reserver of reserves) {
      //   if (reserver.oldHaveNeed) {
      //     const totalChange = reserver.oldHaveNeed - reserver.haveNeed
      //     // now find affected lockedTodos
      //     for (const todo of lockedTodos) {
      //       console.log({ reserver, totalChange, todo })
      //       if (Math.sign(reserver.oldHaveNeed) === Math.sign(reserver.haveNeed)) {
      //         if (reserver.haveNeed < 0) {
      //           // a needer has changed their need, only modify old todo if need was reduced
      //           if (totalChange < 0) {
      //             todo.total += totalChange
      //             todo.amount += totalChange
      //           }
      //         } else {
      //           // a pledger has changed their pledge, only modify old todo if pledge was reduced
      //           if (totalChange > 0) {
      //             todo.total -= totalChange
      //             todo.amount -= totalChange
      //           }
      //         }
      //       } else {
      //         // handle those who've switched sides differently
      //       }
      //     }
      //     delete getUser(reserver.name).oldHaveNeed
      //   }
      // }
      // now set the reserve haveNeeds to the actual reserves
      for (const reserver of reserves) {
        if (reserver.haveNeed > 0) {
          reserver.haveNeed -= reduceField('total', 'from', reserver.name, lockedTodos)
          // reserver.haveNeed -= reduceField('amount', 'from', reserver.name, payments)
          reserver.haveNeed = Math.max(reserver.haveNeed, 0)
        } else if (reserver.haveNeed < 0) {
          reserver.haveNeed += reduceField('total', 'to', reserver.name, lockedTodos)
          // reserver.haveNeed += reduceField('amount', 'to', reserver.name, payments)
          reserver.haveNeed = Math.min(reserver.haveNeed, 0)
        }
      }
      // TODO: figure out whether subTodos or massagedDistribution or distribution needs to be minimized
      const subTodos = ensureTotalSet(mincomeProportional(reserves))
      // console.log(`minimization (${minimizeTxns ? 'on' : 'off'}):`, { reserves, payments, subTodos, distribution })
      const todosWithoutExistingPayments = {}
      const redistributeTodoHaveNeed = {}
      // console.log({ reserves, lockedTodos, distribution, prevPayments })
      for (const todo of subTodos) {
        todosWithoutExistingPayments[todo.from] = []
        redistributeTodoHaveNeed[todo.from] = []
      }
      // take any todos generated this time for user X that have a corresponding existing payment
      // from the previous sequence and remove them, redistributing their amount to the other
      // todos for user X that don't have existing payments
      for (const todo of subTodos) {
        if (todoExistsInDistribution(todo, prevPayments)) {
          redistributeTodoHaveNeed[todo.from].push({
            name: todo.from,
            haveNeed: todo.amount
          })
        } else {
          todosWithoutExistingPayments[todo.from].push(todo)
          redistributeTodoHaveNeed[todo.from].push({
            name: todo.to,
            haveNeed: -(todo.amount)
          })
        }
      }
      // console.log({ prevTodos: distribution, subTodos, reserves, prevPayments })
      let redistribution
      let redistributions = []
      for (const name in redistributeTodoHaveNeed) {
        redistribution = ensureTotalSet(mincomeProportional(redistributeTodoHaveNeed[name]))
        // console.log(`redistributeTodoHaveNeed for ${name}`, redistributeTodoHaveNeed[name], 'redistribution', redistribution, 'adding to:', todosWithoutExistingPayments[name])
        todosWithoutExistingPayments[name] = addDistributions(
          todosWithoutExistingPayments[name], redistribution
        )
        // take the total amount that were increased to each "to" from this "from"
        // and proportionally subtract them from each other inputs to this "to"
        const totalRedistributed = redistribution.reduce((a, i) => a + i.amount, 0)
        if (totalRedistributed > 0) {
          redistributions = redistributions.concat(redistribution)
        }
      }
      let massagedDistribution = Object.values(todosWithoutExistingPayments).reduce((a, i) => a.concat(i), [])
      // console.log({ massagedDistribution, redistributions })
      for (redistribution of redistributions) {
        // take the total that was redistributed and subtract it from the inputs proportionally
        const tempHaveNeeds = [{ name: redistribution.from, haveNeed: redistribution.amount }]
        massagedDistribution.filter(todo => {
          return todo.to === redistribution.to && todo.from !== redistribution.from
        }).forEach(todo => {
          tempHaveNeeds.push({ name: todo.from, haveNeed: -(todo.amount) })
        })
        mincomeProportional(tempHaveNeeds).forEach(todo => {
          const theTodo = massagedDistribution.find(i => i.from === todo.to && i.to === redistribution.to)
          theTodo.amount -= todo.amount
          theTodo.total -= todo.amount
        })
      }
      // now find the amount remaining in each haver who still has some to give,
      // and find the needers who still need some, and create a new list of haveNeeds based on that
      // to create a "remainderDistribution" that we add back to our massagedDistribution
      const remainderHaveNeeds = []
      const reserverRemainders = {}
      for (const reserver of reserves) {
        if (reserver.haveNeed > 0) {
          const remainder = reserver.haveNeed - massagedDistribution
            .filter(todo => todo.from === reserver.name).reduce((a, i) => a + i.amount, 0)
          // TODO: next line doesn't seem necessary, remove if certain
          // remainder -= payments.filter(p => p.from === reserver.name).reduce((a, i) => a + i.amount, 0)
          if (remainder > 0) {
            remainderHaveNeeds.push({ name: reserver.name, haveNeed: remainder })
            reserverRemainders[reserver.name] = remainder
          }
        } else if (reserver.haveNeed < 0) {
          const remainder = reserver.haveNeed + massagedDistribution
            .filter(todo => todo.to === reserver.name).reduce((a, i) => a + i.amount, 0)
          // remainder += payments.filter(p => p.from === reserver.name).reduce((a, i) => a + i.amount, 0)
          if (remainder < 0) {
            remainderHaveNeeds.push({ name: reserver.name, haveNeed: remainder })
            reserverRemainders[reserver.name] = remainder
          }
        }
      }
      redistribution = []
      // console.log({ remainderHaveNeeds, redistribution, distribution })
      // before we add it however, we need one last check, and that is
      // "verboten remainders". this redistribution can still contain a payment
      // from a user to someone they already did their whole todo for, in which
      // case we must remove it and redistribute it to the other remainders
      const badRemainders = []

      ensureTotalSet(mincomeProportional(remainderHaveNeeds)).forEach(todo => {
        if (todoExistsInDistribution(todo, prevPayments)) {
          badRemainders.push(todo)
        } else {
          redistribution.push(todo)
        }
      })
      for (const badRemainder of badRemainders) {
        const remainderRedist = [{ name: badRemainder.from, haveNeed: badRemainder.amount }]
        for (const r of redistribution) {
          if (r.to === badRemainder.to) {
            // for this input, calculate how much room there is available to distribute
            // the remainder too, subtract the room from the sum of the other remainders
            const availableRoom = reserverRemainders[r.from] - redistribution
              .filter(todo => todo.from === r.from)
              .reduce((a, i) => a + i.amount, 0)
            remainderRedist.push({ name: r.from, haveNeed: -availableRoom })
          }
        }
        mincomeProportional(remainderRedist).forEach(todo => {
          const theTodo = redistribution.find(i => i.to === badRemainder.to && i.from === todo.to)
          theTodo.amount += todo.amount
          theTodo.total += todo.amount
        })
      }
      // console.log({ massagedDistribution, redistribution })
      massagedDistribution = addDistributions(massagedDistribution, redistribution)
      distribution = distribution.filter(todo => todo.totalLocked)
      // console.log('distribution', distribution, 'adding:', massagedDistribution, 'subtracting:', payments)
      if (minimizeTxns) {
        massagedDistribution = ensureTotalSet(minimizeTotalPaymentsCount(massagedDistribution))
      }
      distribution = distribution.concat(massagedDistribution)
      distribution = subtractDistributions(distribution, payments)
      // lock todos that have payments this round as well
      distribution = lockTodos(distribution)
      // console.log({ prevPayments, payments, reserves, subTodos, distribution })
      prevPayments = prevPayments.concat(payments)
      // console.log({ distribution })
    }
  }
  if (!adjusted) {
    return mincomeProportional(groupMembers)
  }

  const tinyNum = 1 / Math.pow(10, DECIMALS_MAX)
  distribution = distribution.filter(todo => {
    // remove any todos for containing miniscule amounts
    // and pledgers who switched sides should have their todos removed
    return todo.amount >= tinyNum && getUser(todo.from).haveNeed > 0
  })

  // console.log({ finalDistribution: distribution })

  const dueDate = dateToMonthstamp(lastDayOfMonth(dateFromMonthstamp(dateToMonthstamp(distributionEvents[distributionEvents.length - 1].data.when))))

  for (const todo of distribution) {
    todo.amount = saferFloat(todo.amount)
    todo.total = saferFloat(todo.total)
    todo.partial = todo.total !== todo.amount
    todo.isLate = false
    todo.dueOn = dueDate
    delete todo.totalLocked
  }

  // TODO: add in latePayments to the end of the distribution
  //       consider passing in latePayments through distributionEvents
  //       instead of as a separate option, and simply do the event handler
  //       for it down here instead of up above.

  return distribution
}

export default parsedistributionFromEvents
