/* @noflow */
const queueFactory = () => {
  const events = []
  const queue = async (fn) => {
    let accept
    const promise = new Promise((resolve) => { accept = resolve })
    if (!fn) fn = () => Promise.resolve()
    const thisEvent = {
      fn,
      promise
    }
    events.push(thisEvent)
    while (events.length > 0) {
      const event = events[0]
      if (event === thisEvent) {
        try {
          return await fn()
        } finally {
          accept()
          events.shift()
        }
      } else {
        await event.promise
      }
    }
  }
  Object.defineProperty(queue, 'length', { get: () => events.length })

  return queue
}

const referenceCountFactory = () => {
  const map = new Map()

  return {
    retain (element) {
      const current = map.get(element) || 0
      console.debug('retain', element, current)
      if (current !== 0) {
        throw new Error('Unexpected reference count')
      }
      map.set(element, current + 1)
    },
    release (element) {
      const current = map.get(element)
      console.debug('release', element, current)
      if (!current) throw new Error('Negative reference count')
      if (current === 1) {
        map.delete(element)
      } else {
        map.set(element, current - 1)
      }
    },
    done () {
      if (!map.keys().next().done) {
        console.info('@@@ Dangling references: ', JSON.stringify(Array.from(map.entries()).sort()))
        throw new Error('There are dangling references')
      }
    }
  }
}

const $join = 'join'
const $leave = 'leave'

const entityFactory = (ourselves, { queue, retain, release, done }) => {
  const members = new Map()
  let height = 0
  const _ephemeralRetain = new Map()
  const _history = []

  const applyReferenceOps = (member) => () => {
    const count = _ephemeralRetain.get(member)
    _ephemeralRetain.delete(member)
    console.debug('applyReferenceOps', 'm=', member, 'count=', count)
    if (!count) return
    try {
      switch (count) {
        case -1:
          release(member)
          break
        case 1:
          retain(member)
          break
        default:
          throw new Error('Unexpected value: ' + count)
      }
    } catch (e) {
      console.debug('applyReferenceOps error', member, count, e)
      throw e
    }
  }

  return {
    [$join] (member) {
      const id = (0, Math.random)().toFixed(6).slice(2)
      const h = height
      console.debug(`[${id}] join              `, h, member, _history)

      const props = members.get(member) || {}
      if (props.active) {
        console.error(id, h, member, props)
        throw new Error(`${[id]} Can't join twice`)
      }
      props.active = true
      props.joinedHeight = height
      members.set(member, props)
      height++
      _history.push([$join, member])

      // queue(() => {
      console.debug(`[${id}] join (side-effect)`, h, member, _history)

      if (!_ephemeralRetain.has(member)) {
        queue(applyReferenceOps(member))
      }
      const count = (_ephemeralRetain.get(member) || 0) + 1
      console.debug(`[${id}] join (side-effect)`, 'h=', h, 'm=', member, 'count=', count)
      _ephemeralRetain.set(member, count)
      // })
    },

    [$leave] (member) {
      const id = (0, Math.random)().toFixed(6).slice(2)
      const h = height
      console.debug(`[${id}] leave              `, h, member, _history)

      _history.push([$leave, member])
      const props = members.get(member)
      if (!props?.active) {
        throw new Error(`${[id]} Can't leave without joining`)
      }
      delete props.active
      height++

      // queue(() => {
      console.debug(`[${id}] leave (side-effect)`, 'h=', h, 'm=', member)

      if (!_ephemeralRetain.has(member)) {
        queue(applyReferenceOps(member))
      }
      const count = (_ephemeralRetain.get(member) || 0) - 1
      console.debug(`[${id}] leave (side-effect)`, 'h=', h, 'm=', member, 'count=', count)
      _ephemeralRetain.set(member, count)
      // })
    },

    remove () {
      const id = (0, Math.random)().toFixed(6).slice(2)
      const h = height
      console.debug(`[${id}] remove (queued)`, h, history)

      const members_ =
         [...members.entries()].filter(([member, { active }]) => {
           return active
         })

      console.debug(`[${id}] remove (queued)`, h, 'members=', members_)

      members_.forEach(([member, props]) => {
        /* if (_ephemeralRetain.get(props.leftHeight) === norelease) {
          _ephemeralRetain.delete(props.leftHeight)
          console.debug(`[${id}] remove (queued), norelease`, h, member)
          return
        } */

        try {
          release(member)
        } catch (e) {
          console.debug(`[${id}] remove Error`, h, member, e)
          throw e
        }
      })

      members.clear()
      height = 0
      this.done()
    },

    done () {
      if (!_ephemeralRetain.values().next().done) {
        console.error('Dangling elements in _ephemeralRetain', [..._ephemeralRetain.entries()])
        throw new Error('Entity has dangling elements in the _ephemeralRetain set')
      }
    },

    resync () {
      const id = (0, Math.random)().toFixed(6).slice(2)
      const h = height
      console.debug(`[${id}] resync (queued)`, h)
      queue(() => this.remove())
      queue(() => {
        console.debug(`[${id}] resync         `, h)
        _history.splice(0).forEach(([action, ...params]) => {
          console.debug(`[${id}] resync`, h, 'op=', action)
          this[action](...params)
        })
      })
    }

  }
}

const run = async (queue, group, op, ...arg) => {
  if (op === 'resync') console.error('-------------')
  console.error('--- run:', op, ...arg)
  switch (op) {
    case $join: {
      await queue(() => group[$join](...arg))
      break
    }
    case $leave: {
      await queue(() => group[$leave](...arg))
      break
    }
    case 'resync': {
      group.resync(...arg)
      await queue()
      break
    }
    case 'queue': {
      await queue(...arg)
      break
    }
  }
}

const random = async (history) => {
  const ourselves = Symbol('ourselves')
  ourselves.toString = () => 'ourselves'
  ourselves.toJSON = () => 'ourselves'
  const queue = queueFactory()
  const referenceCount = referenceCountFactory()
  const users = new Array(15).fill(undefined).map((_, i) => i).concat([ourselves])
  const activeUsers = new Set()
  const inactiveUsers = new Set(users)

  const group = entityFactory(ourselves, {
    queue,
    retain: referenceCount.retain,
    release: referenceCount.release,
    done: referenceCount.done
  })

  for (let i = 0; i < 16; i++) {
    const randomAction = [$join, $leave, 'resync', 'queue'][((0, Math.random)() * 4) | 0]
    switch (randomAction) {
      case $join: {
        const users = Array.from(inactiveUsers)
        if (!users.length) {
          i--
          break
        }
        const user = users.sort(() => Math.sign((0, Math.random()) - 0.5)).pop()
        inactiveUsers.delete(user)
        activeUsers.add(user)
        history.push([$join, user])
        await run(queue, group, $join, user)
        break
      }
      case $leave: {
        const users = Array.from(activeUsers)
        if (!users.length) {
          i--
          break
        }
        const user = users.sort(() => Math.sign((0, Math.random()) - 0.5)).pop()
        activeUsers.delete(user)
        inactiveUsers.add(user)
        history.push([$leave, user])
        await run(queue, group, $leave, user)
        break
      }
      case 'resync': {
        history.push(['resync'])
        await run(queue, group, 'resync')
        break
      }
      case 'queue': {
        history.push(['queue'])
        await run(queue, group, 'queue')
        break
      }
    }
  }

  await queue()
  console.info('Done. Calling remove.')
  queue(() => group.remove())

  // Barrier
  await queue()
  referenceCount.done()
}

const history = []
random(history).catch((e) => {
  console.error(history)
})
