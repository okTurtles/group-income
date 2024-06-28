const raw = Symbol('raw')
export const serdesTagSymbol: symbol = Symbol('tag')
export const serdesSerializeSymbol: symbol = Symbol('serialize')
export const serdesDeserializeSymbol: symbol = Symbol('deserialize')

// This file is at attempt at addressing the lack of support for
// custom objects in `structuredClone`. See <https://github.com/whatwg/html/issues/7428>.
// We need this so that certain custom objects can be shared using a
// `MessagePort`. To use this functionality, the `serializer` function must be
// called on the _sending_ side and the `deserializer` function must be called
// on the _receiving_ side.
// Note that it's paramount that the _receiving_ side call `deserializer.register`
// with all of the possible types that are supported.
// For how to implement `serialize` and `deserialize` support for custom types,
// see the example below for a class `X`.
// These functions are meant to provide, more or less, an augmented version of
// `structuredClone`, thus allowing messages to contain complex JavaScript
// objects, in ways that JSON simply cannot support. For this, JSON.parse and
// JSON.stringify are used to deeply traverse objects, which, combined with
// reviver and replacer callbacks, allows for reconstructing custom object
// types that neither structuredClone nor JSON support on their own (e.g.,
// functions, GIMessage, Secret, etc.).

// Internal function to mark the result of 'serializer' as internal, so that it
// doesn't get accidentally reprocessed.
const rawResult = (obj: Object) => {
  Object.defineProperty(obj, raw, { value: true })
  return obj
}

// The `serializer` function prepares data before sending it as a message
export const serializer = (data: any): any => {
  const verbatim: any[] = []
  const transferables = new Set()
  const revokables = new Set()
  // JSON.parse and JSON.stringify are called for their ability to do a deep
  // clone and calling a reviver / replacer.
  const result = JSON.parse(JSON.stringify(data, (_key: string, value: any) => {
    // Return already processed values without modifications
    if (value && value[raw]) return value
    // Encode undefined as ['_', '_']
    if (value === undefined) return rawResult(['_', '_'])
    // Encode falsy values as they are (JSON.stringify can handle these well,
    // except undefined, which can't be represented in JSON)
    if (!value) return value
    // Arrays starting with '_' hold special (internal) meaning. If we receive
    // such a value to encode, we prepend '_', '_' to ensure they are properly
    // handled (this will be undone when deserializing)
    if (Array.isArray(value) && value[0] === '_') return rawResult(['_', '_', ...value])
    // If something is a Map, encode it as such. It needs to be broken down into
    // an array so that elements they contain can also be processed, since JSON
    // does not support Map
    if (value instanceof Map) {
      return rawResult(['_', 'Map', Array.from(value.entries())])
    }
    // Same for Sets
    if (value instanceof Set) {
      return rawResult(['_', 'Set', Array.from(value.entries())])
    }
    // Error, Blob, File, etc. are supported by structuredClone but not by JSON
    // We mark these as 'refs', so that the reviver can undo tris transformation
    if (value instanceof Error || value instanceof Blob || value instanceof File) {
      const pos = verbatim.length
      verbatim[verbatim.length] = value
      return rawResult(['_', '_ref', pos])
    }
    // Same for other types supported by structuredClone but not JSON
    if (value instanceof MessagePort || value instanceof ReadableStream || value instanceof WritableStream || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      const pos = verbatim.length
      verbatim[verbatim.length] = value
      transferables.add(value)
      return rawResult(['_', '_ref', pos])
    }
    // Functions aren't supported neither by structuredClone nor JSON. However,
    // we can convert functions into a MessagePort, which is supported
    if (typeof value === 'function') {
      const mc = new MessageChannel()
      mc.port1.onmessage = async (ev) => {
        try {
          try {
            // $FlowFixMe[incompatible-use]
            const result = await value(...deserializer(ev.data[1]))
            const { data, transferables } = serializer(result)
            // $FlowFixMe[incompatible-use]
            ev.data[0].postMessage([true, data], transferables)
          } catch (e) {
            const { data, transferables } = serializer(e)
            // $FlowFixMe[incompatible-use]
            ev.data[0].postMessage([false, data], transferables)
          }
        } catch (e) {
          console.error('Async error on onmessage handler', e)
        }
      }
      transferables.add(mc.port2)
      revokables.add(mc.port1)
      return rawResult(['_', '_fn', mc.port2])
    }
    const proto = Object.getPrototypeOf(value)
    // This allows encoding custom arbitrary objects (e.g., GIMessage)
    if (proto?.constructor?.[serdesTagSymbol] && proto.constructor[serdesSerializeSymbol]) {
      return rawResult(['_', '_custom', proto.constructor[serdesTagSymbol], proto.constructor[serdesSerializeSymbol](value)])
    }
    return value
  }), (_key: string, value: any) => {
    // Undo _ref transformations so that structuredClone can send the correct
    // object
    if (Array.isArray(value) && value[0] === '_' && value[1] === '_ref') {
      return verbatim[value[2]]
    }
    return value
  })

  return {
    data: result,
    transferables: Array.from(transferables),
    revokables: Array.from(revokables)
  }
}

// Internal lookup table for registered deserializers
const deserializerTable = Object.create(null)

// The `deserializer` function reconstructs data on the receiving side
export const deserializer = (data: any): any => {
  const verbatim: any[] = []
  // JSON.parse and JSON.stringify are called for their ability to do a deep
  // clone and calling a reviver / replacer.
  return JSON.parse(JSON.stringify(data, (_key: string, value: any) => {
    // $FlowFixMe[prop-missing]
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
      const pos = verbatim.length
      verbatim[verbatim.length] = value
      return rawResult(['_', '_ref', pos])
    }
    return value
  }), (_key: string, value: any) => {
    if (Array.isArray(value) && value[0] === '_') {
      switch (value[1]) {
        case '_':
          if (value.length >= 3) {
            // This was an input that was an array starting with [_, _]
            return value.slice(2)
          } else {
            // This was 'undefined' ([_, _])
            return undefined
          }
        // Map input (reconstruct Map)
        case 'Map':
          return new Map(value[2])
        // Set input (reconstruct Set)
        case 'Set':
          return new Set(value[2])
        // Custom object type (reconstruct if possible, otherwise throw an error)
        case '_custom':
          if (deserializerTable[value[2]]) {
            return deserializerTable[value[2]](value[3])
          } else {
            throw new Error('Invalid or unknown tag: ' + value[2])
          }
        // These are literal values, return them
        case '_ref':
          return verbatim[value[2]]
        // These were functions converted to a MessagePort. Convert them on this
        // end back into functions using that port.
        case '_fn': {
          const mp = value[2]
          return (...args) => {
            return new Promise((resolve, reject) => {
              const mc = new MessageChannel()
              const { data, transferables } = serializer(args)
              mc.port1.onmessage = (ev) => {
                // $FlowFixMe[incompatible-use]
                if (ev.data[0]) {
                  // $FlowFixMe[incompatible-use]
                  resolve(deserializer(ev.data[1]))
                } else {
                  // $FlowFixMe[incompatible-use]
                  reject(deserializer(ev.data[1]))
                }
              }
              mp.postMessage([mc.port2, data], [mc.port2, ...transferables])
            })
          }
        }
      }
    }
    return value
  })
}

// $FlowFixMe[unsupported-syntax]
deserializer.register = <T>(y: { new (...x: any): T, [typeof serdesTagSymbol]: string, [typeof serdesDeserializeSymbol]: (...x: any) => T }) => {
  if (typeof y === 'function' && typeof y[serdesTagSymbol] === 'string' && typeof y[serdesDeserializeSymbol] === 'function') {
    deserializerTable[y[serdesTagSymbol]] = y[serdesDeserializeSymbol].bind(y)
  }
}

/*
// Example

class X {
  __x: '11';
  constructor () {
    this.__x = '11'
  }
  static [serdesDeserializeSymbol] () {
    return new this()
  }
  static get [serdesTagSymbol] () {
    return 'X'
  }
  static [serdesSerializeSymbol] (x: InstanceType<typeof this>) {
    return undefined
  }
}

deserializer.register(X)

console.log(
  deserializer(
    structuredClone(
      serializer(
        [
          '_',
          '_',
          [
            '_',
            '_',
            '_',
            new Map([['a', new X()], ['b', new Error('my error')]])
          ]
        ]
      )
    )
  )
)
*/
