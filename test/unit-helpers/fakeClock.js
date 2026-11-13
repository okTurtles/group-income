// A fake clock for unit tests. The timers' callbacks only run when `advance`
// (or `flush`, which is `advance(0)`) reaches their time, in time order. Timers
// due at the same time run in the order they were set; as with real timers,
// an interval counts as set again each time it has run. An interval runs every
// `ms` (at least 1 ms) until cleared. A callback that throws stops `advance`
// at that callback's time: the exception propagates, and the later timers
// stay pending.
export const fakeClock = ({ start = 1_000_000 } = {}) => {
  let time = start
  let nextID = 1
  // The order in which timers were set, for timers due at the same time
  let nextOrder = 1
  const queue = []
  const add = (fn, ms, every) => {
    const id = nextID++
    queue.push({ id, order: nextOrder++, at: time + ms, fn, every })
    return id
  }
  const remove = (id) => {
    const index = queue.findIndex(timer => timer.id === id)
    if (index !== -1) queue.splice(index, 1)
  }
  const advance = (ms) => {
    const end = time + ms
    for (;;) {
      queue.sort((a, b) => a.at - b.at || a.order - b.order)
      const timer = queue[0]
      if (!timer || timer.at > end) break
      time = timer.at
      if (timer.every) timer.at += timer.every
      else queue.shift()
      timer.fn()
      if (timer.every) timer.order = nextOrder++
    }
    time = end
  }
  return {
    now: () => time,
    set: (value) => { time = value },
    timers: {
      setTimeout: (fn, ms) => add(fn, ms),
      clearTimeout: remove,
      setInterval: (fn, ms) => add(fn, ms, Math.max(ms, 1)),
      clearInterval: remove
    },
    advance,
    flush: () => advance(0),
    pendingTimers: () => queue.length
  }
}
