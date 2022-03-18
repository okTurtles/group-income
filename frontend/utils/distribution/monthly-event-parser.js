'use strict'
import mincomeProportional from '~/frontend/utils/distribution/mincome-proportional.js'
import minimizeTotalPaymentsCount from './payments-minimizer.js'
import { lastDayOfMonth, dateFromMonthstamp, dateToMonthstamp } from '~/frontend/utils/time.js'
import { cloneDeep } from '~/frontend/utils/giLodash.js'
import { saferFloat } from '~/frontend/views/utils/currencies.js'

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
  adjusted: boolean,
  minimizeTxns: boolean,
  latePayments?: Array<Object>
): Distribution {
  const distributionEventsCopy = cloneDeep(distributionEvents)

  const groupMembers = []
  let payments = []
  let distribution = []

  // Convenience function for retreiving a user by name:
  const getUser = (name, members = groupMembers) => members.find(member => member.name === name)

  const eventHandlers = {
    haveNeedEvent (event) {
      const oldUser = getUser(event.data.name)
      if (oldUser) {
        oldUser.haveNeed = event.data.haveNeed
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
  const reduceField = (dir, name, field, dist) => {
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
      }
      // todo.amount = saferFloat(todo.amount)
      // todo.total = saferFloat(todo.total)
    }
  }
  // Principles:
  // 1. Once a payment is made, the .total between those two users is set for life
  // 2. mincomeProportional should be re-applied to the remainer of the haveNeeds,
  //    subtracting the .total from them, and redistributing todos between any parties
  //    that already have payments between them to other todos, and then concattenating
  //    that todo list with the previous todo list, and then subtracting any new
  //    payments
  let prevTodos
  let prevPayments = []
  for (const sequence of distributionSequences) {
    console.log('\n======= LOOP!!! Sequence:', sequence, '\n')
    payments = []
    for (const event of sequence) {
      eventHandlers[event.type](event)
    }
    if (adjusted) {
      if (prevTodos) {
        const reserves = cloneDeep(groupMembers)
        const lockedTodos = prevTodos.filter(todo => todo.totalLocked)
        for (const reserver of reserves) {
          if (reserver.haveNeed > 0) {
            // reserver.haveNeed -= reduceField('from', reserver.name, 'amount', prevPayments)
            reserver.haveNeed -= reduceField('from', reserver.name, 'total', lockedTodos)
            reserver.haveNeed = Math.max(reserver.haveNeed, 0)
          } else if (reserver.haveNeed < 0) {
            // reserver.haveNeed += reduceField('to', reserver.name, 'amount', prevPayments)
            reserver.haveNeed += reduceField('to', reserver.name, 'total', lockedTodos)
            reserver.haveNeed = Math.min(reserver.haveNeed, 0)
          }
        }
        let subTodos = mincomeProportional(reserves)
        // if (minimizeTxns) {
        //   subTodos = minimizeTotalPaymentsCount(subTodos, reserves, prevPayments.concat(payments))
        // }
        subTodos = ensureTotalSet(subTodos)
        const todosWithoutExistingPayments = {}
        const redistributeTodoHaveNeed = {}
        console.log({ reserves, lockedTodos, prevTodos, prevPayments })
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
        // console.log('subTodos:', subTodos)
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
        console.log({ massagedDistribution, redistributions })
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
            // TODO: double check if this next line is necessary
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
        // console.log({ remainderHaveNeeds, redistribution, prevTodos })
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
        console.log({ finalRemainderDist: redistribution, remainderHaveNeeds })
        massagedDistribution = addDistributions(massagedDistribution, redistribution)
        prevTodos = prevTodos.filter(todo => todo.totalLocked)
        // console.log('prevTodos', prevTodos, 'adding:', todosWithoutExistingPayments)
        prevTodos = prevTodos.concat(massagedDistribution)
        prevTodos = subtractDistributions(prevTodos, payments)
        // lock todos that have payments this round as well
        lockTodos(prevTodos)
        // TODO: figure out what to do if there's a haveNeed putting the needer below the lock point
        // TODO: apply saferFloat to the final distribution at each step
        // console.log({ prevPayments, payments, reserves, subTodos, prevTodos })
        prevPayments = prevPayments.concat(payments)
        // console.log({ prevPayments, newTodos: prevTodos })
      } else {
        distribution = mincomeProportional(groupMembers)
        // if (minimizeTxns) {
        //   distribution = minimizeTotalPaymentsCount(distribution, groupMembers, payments)
        // }
        // TODO: here we can loop through and remove/modify TODOs based on payments made
        //       that took out the entire haveNeed.
        //       see scenario "Entire payment paid scenario". prefer fixing that test
        //       since that would mean we can avoid including minimizeTotalPaymentsCount here
        // TODO: experiment with not calling subtractDistributions(distribution, payments)
        //       but instead lowering the .haveNeed from the start with all of the payments
        //       before running mincomeProportional.. but note that might not be the
        //       right way to go because subtractDistributions usefully updates .amount
        distribution = ensureTotalSet(distribution)
        distribution = subtractDistributions(distribution, payments) // .filter(todo => todo.amount > 0)
        // lock the .total if a payment has been made
        lockTodos(distribution)
        prevTodos = distribution
        prevPayments = payments
        console.log({ payments, distribution })
      }
    }
  }
  if (!adjusted) {
    distribution = mincomeProportional(groupMembers)
  } else {
    if (!prevTodos) return [] // empty distributionEvents

    distribution = prevTodos.filter(todo => {
      // pledgers who switched sides should have their todos removed
      return todo.amount > 0 && getUser(todo.from).haveNeed > 0
    })

    const dueDate = dateToMonthstamp(lastDayOfMonth(dateFromMonthstamp(dateToMonthstamp(distributionEvents[distributionEvents.length - 1].data.when))))

    for (const todo of distribution) {
      // TODO: this .total seems wrong, fix
      // todo.total = todo.amount + reduceField('to', todo.to, 'amount', prevPayments.filter(p => p.from === todo.from))
      todo.amount = saferFloat(todo.amount)
      todo.total = saferFloat(todo.total)
      todo.partial = todo.total !== todo.amount
      todo.isLate = false
      todo.dueOn = dueDate
      delete todo.totalLocked
    }
  }

  // TODO: add in latePayments to the end of the distribution
  //       consider passing in latePayments through distributionEvents
  //       instead of as a separate option, and simply do the event handler
  //       for it down here instead of up above.

  return minimizeTxns
    ? minimizeTotalPaymentsCount(distribution, groupMembers, prevPayments)
    : distribution
}

export default parsedistributionFromEvents
