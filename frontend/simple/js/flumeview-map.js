const Pull = require('pull-stream')
const Notify = require('pull-notify')
export default function (map) {
  return function (log, name) {
    return {
      since: log.since,
      methods: { stream: 'source' },
      createSink: function (cb) {
        return Pull.map(map)
      },
      stream: function () {
        let notify = Notify()
        let stop
        let store = log.store()
        Pull(log.stream({ seqs: true, values: true }), Pull.drain((data) => {
          notify(data)
        }), () => {
          // End Stream when log postion changes to the past
          stop = store.watch((state) => {
            return state.offset.length
          }, () => {
            notify.end()
            stop()
          })
          Pull(log.notifier(), Pull.drain((data) => {
            notify(data)
          }))
        })
        return Pull(notify.listen(), Pull.map(map))
      },
      close: (cb) => { return cb() },
      destroy: (cb) => { return cb() }
    }
  }
}
