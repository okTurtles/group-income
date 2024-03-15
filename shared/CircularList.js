'use strict'

// A list with fixed capacity and constant-time `add()`.
export default class CircularList {
  #buffer: string[]
  #capacity = 0
  #defaultValue = ''
  #isFull = false
  #offset = 0

  constructor (capacity: number, defaultValue: any = '') {
    this.#buffer = new Array(capacity).fill(defaultValue)
    this.#capacity = capacity
    this.#defaultValue = defaultValue
  }

  add (entry: any) {
    const capacity = this.#capacity
    const offset = this.#offset
    this.#buffer[offset] = entry
    if (offset === capacity - 1) {
      this.#isFull = true
    }
    this.#offset = (offset + 1) % capacity
  }

  addAll (entries: Array<*>) {
    for (const entry of entries) {
      this.add(entry)
    }
  }

  clear () {
    this.#buffer.fill(this.#defaultValue)
    this.#isFull = false
    this.#offset = 0
  }

  toArray (): Array<*> {
    const buffer = this.#buffer
    const offset = this.#offset
    return (
      this.#isFull
        ? [...buffer.slice(offset), ...buffer.slice(0, offset)]
        : buffer.slice(0, offset)
    )
  }
}
