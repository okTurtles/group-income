const raw = Symbol('raw')
export const serdesTagSymbol = Symbol('tag')
export const serdesSerializeSymbol = Symbol('serialize')
export const serdesDeserializeSymbol = Symbol('deserialize')

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

// Internal function to mark the result of 'serializer' as internal, so that it
// doesn't get accidentally reprocessed.
const rawResult = (obj: Object) => {
  Object.defineProperty(obj, raw, { value: true })
  return obj
}

// The `serializer` function prepares data before sending it as a message
export const serializer = (data: any) => {
  const verbatim: any[] = []
  return JSON.parse(JSON.stringify(data, (_key: string, value: any) => {
    if (value && value[raw]) return value
    if (value === undefined) return rawResult(['_', '_'])
    if (!value) return value
    if (Array.isArray(value) && value[0] === '_') return rawResult(['_', '_', ...value])
    if (value instanceof Map) {
      return rawResult(['_', 'Map', Array.from(value.entries())])
    }
    if (value instanceof Set) {
      return rawResult(['_', 'Set', Array.from(value.entries())])
    }
    if (value instanceof MessagePort || value instanceof Error || value instanceof Blob || value instanceof File) {
      const pos = verbatim.length
      verbatim[verbatim.length] = value
      return rawResult(['_', '_ref', pos])
    }
    const proto = Object.getPrototypeOf(value)
    if (proto && proto.constructor[serdesTagSymbol] && proto.constructor[serdesSerializeSymbol]) {
      return rawResult(['_', '_custom', proto.constructor[serdesTagSymbol], proto.constructor[serdesSerializeSymbol](value)])
    }
    return value
  }), (_key: string, value: any) => {
    if (Array.isArray(value) && value[0] === '_' && value[1] === '_ref') {
      return verbatim[value[2]]
    }
    return value
  })
}

// Internal lookup table for registered deserializers
const deserializerTable = Object.create(null)

// The `deserializer` function reconstructs data on the receiving side
export const deserializer = (data: any) => {
  const verbatim: any[] = []
  return JSON.parse(JSON.stringify(data, (_key: string, value: any) => {
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
            return value.slice(2)
          } else {
            return undefined
          }
        case 'Map':
          return new Map(value[2])
        case 'Set':
          return new Set(value[2])
        case '_custom':
          if (deserializerTable[value[2]]) {
            return deserializerTable[value[2]](value[3])
          } else {
            throw new Error('Invalid or unknown tag: ' + value[2])
          }
        case '_ref':
          return verbatim[value[2]]
      }
    }
    return value
  })
}

deserializer.register = <T>(y: { new (...x: never[]): T, [serdesTagSymbol]: string, [serdesDeserializeSymbol]: (...x: never[]) => T }) => {
  if (typeof y === 'function' && typeof y[serdesTagSymbol] === 'string' && typeof y[serdesDeserializeSymbol] === 'function') {
    deserializerTable[y[serdesTagSymbol]] = y[serdesDeserializeSymbol].bind(y)
  }
}

/*
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

console.log(deserializer(structuredClone(serializer(['_', '_', ['_', '_', '_', new Map([['a', new X()], ['b', new Error('my error')]])]]))))
*/
