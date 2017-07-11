import store from './state'
var _queue = new WeakMap()
var _waits = new WeakMap()
class EventQueue {
  constructor () {
    _queue.set(this, [])
    _waits.set(this, [])
  }
  lock () {
    if (!store.state.handlingEvent) { store.commit('toggleHandlingEvent') }
    let queue = _queue.get(this)
    let unlock
    let promise = new Promise(resolve => (unlock = resolve))
    promise.then(() => {
      let index = queue.findIndex(prms => prms === promise)
      if (index > -1) { queue.splice(index, 1) }
      if (queue.length === 0) { this.release() }
    })
    queue.push(promise)
    return unlock
  }
  release () {
    let waits = _waits.get(this)
    for (let wait of waits) {
      wait()
    }
    _waits.set(this, [])
    if (store.state.handlingEvent) { store.commit('toggleHandlingEvent') }
  }
  wait () {
    let waits = _waits.get(this)
    let queue = _queue.get(this)
    let release
    let promise = new Promise(resolve => (release = resolve))
    waits.push(release)
    if (queue.length === 0) { this.release() }
    return promise
  }
}
var eventQueue = new EventQueue()
export default eventQueue
