import store from '../model/state'
import Vue from 'vue'
// Private Members
var _queue = new WeakMap()
var _isRunning = new WeakMap()
class VuexQueue {
  constructor () {
    _queue.set(this, [])
    _isRunning.set(this, false)
  }

  // call an action return a promise
  dispatch (id, payload) {
    return this.enqueue('action', id, payload)
  }

  // call a mutation return a promise
  commit (id, payload) {
    return this.enqueue('mutation', id, payload)
  }

  async run () {
    // Run if not already started
    if (!_isRunning.get(this)) {
      // set running flag
      _isRunning.set(this, true)
      const queue = _queue.get(this)
      // loop through queue
      let next = queue.pop()
      while (next) {
        try {
          if (next.type === 'mutation') {
            store.commit(next.id, next.payload)
          } else {
            await store.dispatch(next.id, next.payload)
          }
          // release promise
          next.release()
        } catch (ex) {
          next.exception(ex)
        }
        next = queue.pop()
      }
      _isRunning.set(this, false)
    }
  }

  enqueue (type, id, payload) {
    const queue = _queue.get(this)
    let release
    let exception
    const promise = new Promise((resolve, reject) => (release = resolve) && (exception = reject))
    queue.push({ type, id, payload, release, exception })
    this.run()
    return promise
  }

  get isRunning () {
    return _isRunning.get(this)
  }
}
var vuexQueue = new VuexQueue()
var queue = {}
queue.install = function (Vue, options) {
  Vue.queue = vuexQueue
  Vue.prototype.$queue = vuexQueue
}
Vue.use(queue)
export default vuexQueue
