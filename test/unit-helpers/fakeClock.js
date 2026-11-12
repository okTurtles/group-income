// A fake clock for unit tests. The timers' callbacks only run when `advance`
// (or `flush`, which is `advance(0)`) reaches their time, in time order (and
// in creation order for the same time). An interval runs every `ms` until
// cleared.
export const fakeClock = ({ start = 1_000_000 } = {}) => {
  let time = start
  let nextID = 1
  const queue = []
  const add = (fn, ms, every) => {
    const id = nextID++
    queue.push({ id, at: time + ms, fn, every })
    return id
  }
  const remove = (id) => {
    const index = queue.findIndex(timer => timer.id === id)
    if (index !== -1) queue.splice(index, 1)
  }
  const advance = (ms) => {
    const end = time + ms
    for (;;) {
      queue.sort((a, b) => a.at - b.at || a.id - b.id)
      const timer = queue[0]
      if (!timer || timer.at > end) break
      time = timer.at
      if (timer.every) timer.at += timer.every
      else queue.shift()
      timer.fn()
    }
    time = end
  }
  return {
    now: () => time,
    set: (value) => { time = value },
    timers: {
      setTimeout: (fn, ms) => add(fn, ms),
      clearTimeout: remove,
      setInterval: (fn, ms) => add(fn, ms, ms),
      clearInterval: remove
    },
    advance,
    flush: () => advance(0),
    pendingTimers: () => queue.length
  }
}
