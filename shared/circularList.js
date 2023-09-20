'use strict'

// A list with fixed capacity and constant-time `add()`.
export function createCircularList (capacity: number, defaultValue: any = ''): Object {
  const buffer: string[] = new Array(capacity).fill(defaultValue)
  let isFull = false
  let offset = 0

  // NOTE: this code doesn't let distinct instances share their method objects,
  // which would be bad for memory usage if many instances were created.
  // But that's fine since we're only using one so far.
  return {
    add (entry) {
      buffer[offset] = entry
      if (offset === capacity - 1) {
        isFull = true
      }
      offset = (offset + 1) % capacity
    },
    addAll (entries: Array<*>) {
      for (const entry of entries) {
        this.add(entry)
      }
    },
    clear () {
      buffer.fill(defaultValue)
      isFull = false
      offset = 0
    },
    toArray (): Array<*> {
      return (
        isFull
          ? [...buffer.slice(offset), ...buffer.slice(0, offset)]
          : buffer.slice(0, offset)
      )
    }
  }
}
