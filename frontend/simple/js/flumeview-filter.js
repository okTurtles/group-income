const Filter = require('pull-stream/throughs/filter')
const Pull = require('pull-stream')
const Notify = require('pull-notify')
export default function (filter) {
  return function (log, name) {
    return {
      since: log.since,
      methods: { stream: 'source' },
      createSink: function (cb) {
        return Filter(filter)
      },
      stream: function () {
        let notify = Notify()
        Pull(log.stream({ seqs: true, values: true }), Pull.drain((data) => {
          notify(data)
        }), () => {
          Pull(log.notifier(), Pull.drain((data) => {
            notify(data)
          }))
        })
        return Pull(notify.listen(), Filter(filter))
      },
      close: (cb) => { return cb() },
      destroy: (cb) => { return cb() }
    }
  }
}
