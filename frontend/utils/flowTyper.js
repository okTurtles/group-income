// to make rollup happy, I copied flowTyper-js
// library into this file (it was refusing to
// import because of the way functions were being
// exported).

type LiteralValue = boolean | number | string
type ObjectRecord<T> = { [key: string]: T }
type TypeValidator<T> = (mixed, _?:string) => T
type TypeMaybeValidator<T> = (mixed, _?:string) => ?T
type TypeArrayValidator<T> = (mixed, _?:string) => T[]
type TypeValidatorRecord<T> = ObjectRecord<TypeValidator<T>>
type $Literal<T: LiteralValue> = TypeValidator<T>

type TypeValidatorsOf2<T, U> = [
  TypeValidator<T>,
  TypeValidator<U>
]

type TypeValidatorsOf3<T, U, V> = [
  TypeValidator<T>,
  TypeValidator<U>,
  TypeValidator<V>
]

type TypeValidatorsOf4<T, U, V, Z> = [
  TypeValidator<T>,
  TypeValidator<U>,
  TypeValidator<V>,
  TypeValidator<Z>,
]

type TypeValidatorsOf5<T, U, V, Z, X> = [
  TypeValidator<T>,
  TypeValidator<U>,
  TypeValidator<V>,
  TypeValidator<Z>,
  TypeValidator<X>
]

export const EMPTY_VALUE = Symbol('@@empty')
export const isEmpty = v => v === EMPTY_VALUE
export const isNil = v => v === null
export const isUndef = v => typeof v === 'undefined'
export const isBoolean = v => typeof v === 'boolean'
export const isNumber = v => typeof v === 'number'
export const isString = v => typeof v === 'string'
export const isObject = v => !isNil(v) && typeof v === 'object'
export const isFunction = v => typeof v === 'function'

export const isType = typeFn => (v, _scope = '') => {
  try {
    typeFn(v, _scope)
    return true
  } catch (_) {
    return false
  }
}

// This function will return value based on schema with inferred types. This
// value can be used to define type in Flow with 'typeof' utility.
export const typeOf = schema => schema(EMPTY_VALUE, '')
export const getType = (typeFn, _options) => {
  if (isFunction(typeFn.type)) return typeFn.type(_options)
  return typeFn.name || '?'
}

// error
class TypeValidatorError extends Error {
  expectedType: string
  valueType: string
  value: string
  typeScope: string
  sourceFile: string

  constructor (
    message: ?string,
    expectedType: string,
    valueType: string,
    value: string,
    typeName: string = '',
    typeScope: ?string = ''
  ) {
    const errMessage = message ||
      `invalid "${valueType}" value type; ${typeName || expectedType} type expected`
    super(errMessage)
    this.expectedType = expectedType
    this.valueType = valueType
    this.value = value
    this.typeScope = typeScope || ''
    this.sourceFile = this.getSourceFile()
    this.message = `${errMessage}\n${this.getErrorInfo()}`
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TypeValidatorError)
    }
  }

  getSourceFile (): string {
    const fileNames = this.stack.match(/(\/[\w_\-.]+)+(\.\w+:\d+:\d+)/g) || []
    return fileNames.find(fileName => fileName.indexOf('/flowTyper-js/dist/') === -1) || ''
  }

  getErrorInfo (): string {
    return `
    file     ${this.sourceFile}
    scope    ${this.typeScope}
    expected ${this.expectedType.replace(/\n/g, '')}
    type     ${this.valueType}
    value    ${this.value}
`
  }
}

// TypeValidatorError.prototype.name = 'TypeValidatorError'
// exports.TypeValidatorError = TypeValidatorError

const validatorError = <T>(
  typeFn: TypeValidator<T>,
  value: mixed,
  scope: ?string,
  message?: string,
  expectedType?: string,
  valueType?: string
): TypeValidatorError => {
  return new TypeValidatorError(
    message,
    expectedType || getType(typeFn),
    valueType || typeof value,
    JSON.stringify(value),
    typeFn.name,
    scope
  )
}

export const arrayOf =
  <T>(typeFn: TypeValidator<T>, label?: string = 'Array'): TypeArrayValidator<T> => {
    function array (value, _scope = label) {
      if (isEmpty(value)) return [typeFn(value)]
      if (Array.isArray(value)) {
        let index = 0
        return value.map(v => typeFn(v, `${_scope}[${index++}]`))
      }
      throw validatorError(array, value, _scope)
    }
    array.type = () => `Array<${getType(typeFn)}>`
    return array
  }

export const literalOf =
  <T: LiteralValue>(primitive: T): TypeValidator<T> => {
    function literal (value, _scope = '') {
      if (isEmpty(value) || (value === primitive)) return primitive
      throw validatorError(literal, value, _scope)
    }
    literal.type = () => {
      if (isBoolean(primitive)) return `${primitive ? 'true' : 'false'}`
      else return `"${primitive}"`
    }
    return literal
  }

export const mapOf = <K, V>(
  keyTypeFn: TypeValidator<K>,
  typeFn: TypeValidator<V>
): TypeValidator<{ [K]: V }> => {
  function mapOf (value, _scope = 'Map') {
    if (isEmpty(value)) return {}
    const o = object(value, _scope)
    const reducer = (acc, key) =>
      Object.assign(
        acc,
        {
          // $FlowFixMe
          [keyTypeFn(key, `${_scope}[_]`)]: typeFn(o[key], `${_scope}.${key}`)
        }
      )
    return Object.keys(o).reduce(reducer, {})
  }
  mapOf.type = () => `{ [_:${getType(keyTypeFn)}]: ${getType(typeFn)} }`
  return mapOf
}

const isPrimitiveFn = (typeName) =>
  ['undefined', 'null', 'boolean', 'number', 'string'].includes(typeName)

export const maybe =
  <T>(typeFn: TypeValidator<T>): TypeMaybeValidator<T> => {
    function maybe (value, _scope = '') {
      return (isNil(value) || isUndef(value)) ? value : typeFn(value, _scope)
    }
    maybe.type = () => !isPrimitiveFn(typeFn.name) ? `?(${getType(typeFn)})` : `?${getType(typeFn)}`
    return maybe
  }

export const mixed = (
  function mixed (value) {
    return value
  }
  : TypeValidator<*>
)

export const object = (
  function (value, _scope = '') {
    if (isEmpty(value)) return {}
    if (isObject(value) && !Array.isArray(value)) {
      return Object.assign({}, value)
    }
    throw validatorError(object, value, _scope)
  }
  : TypeValidator<ObjectRecord<mixed>>
)

export const objectOf = <O: TypeValidatorRecord<*>>
  (typeObj: O, label?: string = 'Object'): TypeValidator<$ObjMap<O, <V>(TypeValidator<V>) => V>> => {
  function object2 (value, _scope = label) {
    const o = object(value, _scope)
    const typeAttrs = Object.keys(typeObj)
    const unknownAttr = Object.keys(o).find(attr => !typeAttrs.includes(attr))
    if (unknownAttr) {
      throw validatorError(
        object2,
        value,
        _scope,
        `missing object property '${unknownAttr}' in ${_scope} type`
      )
    }
    const undefAttr = typeAttrs.find(property => {
      const propertyTypeFn = typeObj[property]
      return (propertyTypeFn.name === 'maybe' && !o.hasOwnProperty(property))
    })
    if (undefAttr) {
      throw validatorError(
        object2,
        o[undefAttr],
        `${_scope}.${undefAttr}`,
        `empty object property '${undefAttr}' for ${_scope} type`,
        `void | null | ${getType(typeObj[undefAttr]).substr(1)}`,
        '-'
      )
    }

    const reducer = isEmpty(value)
      ? (acc, key) => Object.assign(acc, { [key]: typeObj[key](value) })
      : (acc, key) => {
        const typeFn = typeObj[key]
        if (typeFn.name === 'optional' && !o.hasOwnProperty(key)) {
          return Object.assign(acc, {})
        } else {
          return Object.assign(acc, { [key]: typeFn(o[key], `${_scope}.${key}`) })
        }
      }
    return typeAttrs.reduce(reducer, {})
  }
  object2.type = () => {
    const props = Object.keys(typeObj).map(
      (key) => typeObj[key].name === 'optional'
        ? `${key}?: ${getType(typeObj[key], { noVoid: true })}`
        : `${key}: ${getType(typeObj[key])}`
    )
    return `{|\n ${props.join(',\n  ')} \n|}`
  }
  return object2
}

export const optional =
  <T>(typeFn: TypeValidator<T>): TypeValidator<T | void> => {
    const unionFn = unionOf(typeFn, undef)
    function optional (v) {
      return unionFn(v)
    }
    optional.type = ({ noVoid }) => !noVoid ? getType(unionFn) : getType(typeFn)
    return optional
  }

export const nil = (
  function nil (value) {
    if (isEmpty(value) || isNil(value)) return null
    throw validatorError(nil, value)
  }
  : TypeValidator<null>
)

export function undef (value, _scope = '') {
  if (isEmpty(value) || isUndef(value)) return undefined
  throw validatorError(undef, value, _scope)
}
undef.type = () => 'void'
// export const undef = (undef: TypeValidator<void>)

export const boolean = (
  function boolean (value, _scope = '') {
    if (isEmpty(value)) return false
    if (isBoolean(value)) return value
    throw validatorError(boolean, value, _scope)
  }
  : TypeValidator<boolean>
)

export const number = (
  function number (value, _scope = '') {
    if (isEmpty(value)) return 0
    if (isNumber(value)) return value
    throw validatorError(number, value, _scope)
  }
  : TypeValidator<number>
)

export const string = (
  function string (value, _scope = '') {
    if (isEmpty(value)) return ''
    if (isString(value)) return value
    throw validatorError(string, value, _scope)
  }
  : TypeValidator<string>
)

type V<T> = TypeValidator<T>
type TupleT =
    (<A>(V<A>) => TypeValidator<[A]>)
  & (<A, B>(V<A>, V<B>) => TypeValidator<[A, B]>)
  & (<A, B, C>(V<A>, V<B>, V<C>) => TypeValidator<[A, B, C]>)
  & (<A, B, C, D>(V<A>, V<B>, V<C>, V<D>) => TypeValidator<[A, B, C, D]>)
  & (<A, B, C, D, E>(V<A>, V<B>, V<C>, V<D>, V<E>) => TypeValidator<[A, B, C, D, E]>)
  & (<A, B, C, D, E, F>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>) => TypeValidator<[A, B, C, D, E, F]>)
  & (<A, B, C, D, E, F, G>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>) => TypeValidator<[A, B, C, D, E, F, G]>)
  & (<A, B, C, D, E, F, G, H>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>, V<H>) => TypeValidator<[A, B, C, D, E, F, G, H]>)
  & (<A, B, C, D, E, F, G, H, I>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>, V<H>, V<I>) => TypeValidator<[A, B, C, D, E, F, G, H, I]>)
  & (<A, B, C, D, E, F, G, H, I, J>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>, V<H>, V<I>, V<J>) => TypeValidator<[A, B, C, D, E, F, G, H, I, J]>)

function tupleOf_ (...typeFuncs) {
  function tuple (value: mixed, _scope = '') {
    const cardinality = typeFuncs.length
    if (isEmpty(value)) return typeFuncs.map(fn => fn(value))
    if (Array.isArray(value) && value.length === cardinality) {
      const tupleValue = []
      for (let i = 0; i < cardinality; i += 1) {
        tupleValue.push(typeFuncs[i](value[i], _scope))
      }
      return tupleValue
    }
    throw validatorError(tuple, value, _scope)
  }
  tuple.type = () => `[${typeFuncs.map(fn => getType(fn)).join(', ')}]`
  return tuple
}

// $FlowFixMe - $Tuple<(A, B, C, ...)[]>
// const tupleOf: TupleT = tupleOf_
export const tupleOf = tupleOf_

type UnionT =
    (<A>(V<A>) => TypeValidator<A>)
  & (<A, B>(V<A>, V<B>) => TypeValidator<A | B>)
  & (<A, B, C>(V<A>, V<B>, V<C>) => TypeValidator<A | B | C>)
  & (<A, B, C, D>(V<A>, V<B>, V<C>, V<D>) => TypeValidator<A | B | C | D>)
  & (<A, B, C, D, E>(V<A>, V<B>, V<C>, V<D>, V<E>) => TypeValidator<A | B | C | D | E>)
  & (<A, B, C, D, E, F>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>) => TypeValidator<A | B | C | D | E | F>)
  & (<A, B, C, D, E, F, G>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>) => TypeValidator<A | B | C | D | E | F | G>)
  & (<A, B, C, D, E, F, G, H>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>, V<H>) => TypeValidator<A | B | C | D | E | F | G | H>)
  & (<A, B, C, D, E, F, G, H, I>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>, V<H>, V<I>) => TypeValidator<A | B | C | D | E | F | G | H | I>)
  & (<A, B, C, D, E, F, G, H, I, J>(V<A>, V<B>, V<C>, V<D>, V<E>, V<F>, V<G>, V<H>, V<I>, V<J>) => TypeValidator<A | B | C | D | E | F | G | H | I | J>)

function unionOf_ (...typeFuncs) {
  function union (value: mixed, _scope = '') {
    for (const typeFn of typeFuncs) {
      try {
        return typeFn(value, _scope)
      } catch (_) {}
    }
    throw validatorError(union, value, _scope)
  }
  union.type = () => `(${typeFuncs.map(fn => getType(fn)).join(' | ')})`
  return union
}
// $FlowFixMe
// const unionOf: UnionT = (unionOf_)
export const unionOf = unionOf_
