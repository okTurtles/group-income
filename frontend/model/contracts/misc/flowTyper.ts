// @ts-nocheck
// Flow never typechecked this file (`.flowconfig` [ignore]), and TypeScript does not
// either: scope parity. `exclude` in tsconfig.json is not enough on its own, because
// the contracts import this file and an excluded file is still checked once imported.
//
// Every export is annotated `any` for the same reason. An ignored module's exports are
// `any` to Flow, so the contracts' call sites into this file were never checked. Left to
// infer, TypeScript would type them from the implementation and start checking those
// call sites -- new checking Flow never did, on code that is frozen once pinned. The
// internal types below are preserved as written, and are what a later pass would use.
// to make rollup happy, I copied flowTyper-js
// library into this file (it was refusing to
// import because of the way functions were being
// exported).
//
// GI EDIT NOTES:
//
// - The following functions can be used directly with 'validate'
//   because they've had their '_scope' second parameter removed:
//   - arrayOf
//   - mapOf
//   - object
//   - objectOf
//   - objectMaybeOf (this is a custom function that didn't exist in flowTyper)
//
// TODO: remove this file from eslintIgnore in package.json and fix errors

type LiteralValue = boolean | number | string
type ObjectRecord<T> = { [key: string]: T }
type TypeValidator<T> = (value: unknown, _?: string) => T
type TypeMaybeValidator<T> = (value: unknown, _?: string) => T | null | undefined
type TypeArrayValidator<T> = (value: unknown, _?: string) => T[]
type TypeValidatorRecord<T> = ObjectRecord<TypeValidator<T>>
type $Literal<T extends LiteralValue> = TypeValidator<T>

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

export const EMPTY_VALUE: any = Symbol('@@empty')
export const isEmpty: any = v => v === EMPTY_VALUE
export const isNil: any = v => v === null
export const isUndef: any = v => typeof v === 'undefined'
export const isBoolean: any = v => typeof v === 'boolean'
export const isNumber: any = v => typeof v === 'number'
export const isString: any = v => typeof v === 'string'
export const isObject: any = v => !isNil(v) && typeof v === 'object'
export const isFunction: any = v => typeof v === 'function'

export const isType: any = typeFn => (v, _scope = '') => {
  try {
    typeFn(v, _scope)
    return true
  } catch (_) {
    return false
  }
}

// This function will return value based on schema with inferred types. This
// value can be used to define type in Flow with 'typeof' utility.
export const typeOf: any = schema => schema(EMPTY_VALUE, '')
export const getType: any = (typeFn, _options) => {
  if (isFunction(typeFn.type)) return typeFn.type(_options)
  return typeFn.name || '?'
}

// error
export class TypeValidatorError extends Error {
  expectedType: string
  valueType: string
  value: string
  typeScope: string
  sourceFile: string

  constructor (
    message: string | null | undefined,
    expectedType: string,
    valueType: string,
    value: string,
    typeName: string = '',
    typeScope: string | null | undefined = ''
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
    this.name = this.constructor.name
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
  value: unknown,
  scope: string | null | undefined,
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

export const arrayOf: any =
  <T>(typeFn: TypeValidator<T>, _scope?: string = 'Array'): TypeArrayValidator<T> => {
    function array (value) {
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

export const literalOf: any =
  <T extends LiteralValue>(primitive: T): TypeValidator<T> => {
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

export const mapOf: any = <K, V>(
  keyTypeFn: TypeValidator<K>,
  typeFn: TypeValidator<V>
): TypeValidator<{ [K]: V }> => {
  function mapOf (value) {
    if (isEmpty(value)) return {}
    const o = object(value)
    const reducer = (acc, key) =>
      Object.assign(
        acc,
        {
          // $FlowFixMe
          [keyTypeFn(key, 'Map[_]')]: typeFn(o[key], `Map.${key}`)
        }
      )
    return Object.keys(o).reduce(reducer, {})
  }
  mapOf.type = () => `{ [_:${getType(keyTypeFn)}]: ${getType(typeFn)} }`
  return mapOf
}

const isPrimitiveFn = (typeName) =>
  ['undefined', 'null', 'boolean', 'number', 'string'].includes(typeName)

export const maybe: any =
  <T>(typeFn: TypeValidator<T>): TypeMaybeValidator<T> => {
    function maybe (value, _scope = '') {
      return (isNil(value) || isUndef(value)) ? value : typeFn(value, _scope)
    }
    maybe.type = () => !isPrimitiveFn(typeFn.name) ? `?(${getType(typeFn)})` : `?${getType(typeFn)}`
    return maybe
  }

export const mixed: any = (
  function mixed (value) {
    return value
  } as TypeValidator<any>
)

export const object: any = (
  function (value) {
    if (isEmpty(value)) return {}
    if (isObject(value) && !Array.isArray(value)) {
      return Object.assign({}, value)
    }
    throw validatorError(object, value)
  } as TypeValidator<ObjectRecord<unknown>>
)

export const objectOf: any = <O extends TypeValidatorRecord<any>>
  (typeObj: O, _scope: string = 'Object'): TypeValidator<$ObjMap<O, <V>(v: TypeValidator<V>) => V>> => {
  function object2 (value) {
    const o = object(value)
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
    // IMPORTANT: because esbuild can actually rename the functions in the compiled source
    //            (e.g. from 'optional' to 'optional2'), we use .includes() instead of ===
    //            to check the .name of a function
    const undefAttr = typeAttrs.find(property => {
      const propertyTypeFn = typeObj[property]
      return (propertyTypeFn.name.includes('maybe') && !o.hasOwnProperty(property))
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
        if (typeFn.name.includes('optional') && !o.hasOwnProperty(key)) {
          return Object.assign(acc, {})
        } else {
          return Object.assign(acc, { [key]: typeFn(o[key], `${_scope}.${key}`) })
        }
      }
    return typeAttrs.reduce(reducer, {})
  }
  object2.type = () => {
    const props = Object.keys(typeObj).map(
      (key) => {
        const ret = typeObj[key].name.includes('optional')
        ? `${key}?: ${getType(typeObj[key], { noVoid: true })}`
        : `${key}: ${getType(typeObj[key])}`
        return ret
      }
    )
    return `{|\n ${props.join(',\n  ')} \n|}`
  }
  return object2
}

// TODO: add flow type annotations and make it use validatorError etc.
export function objectMaybeOf (validations: any, _scope: string = 'Object'): any {
  return function (data: any) {
    object(data)
    for (const key in data) {
      validations[key]?.(data[key], `${_scope}.${key}`)
    }
    return data
  }
}

export const optional: any =
  <T>(typeFn: TypeValidator<T>): TypeValidator<T | void> => {
    const unionFn = unionOf(typeFn, undef)
    function optional (v) {
      return unionFn(v)
    }
    optional.type = ({ noVoid }) => !noVoid ? getType(unionFn) : getType(typeFn)
    return optional
  }

export const nil: any = (
  function nil (value) {
    if (isEmpty(value) || isNil(value)) return null
    throw validatorError(nil, value)
  } as TypeValidator<null>
)

export function undef (value: any, _scope: string = ''): any {
  if (isEmpty(value) || isUndef(value)) return undefined
  throw validatorError(undef, value, _scope)
}
undef.type = () => 'void'
// export const undef = (undef: TypeValidator<void>)

export const boolean: any = (
  function boolean (value, _scope = '') {
    if (isEmpty(value)) return false
    if (isBoolean(value)) return value
    throw validatorError(boolean, value, _scope)
  } as TypeValidator<boolean>
)

export const number: any = (
  function number (value, _scope = '') {
    if (isEmpty(value)) return 0
    if (isNumber(value)) return value
    throw validatorError(number, value, _scope)
  } as TypeValidator<number>
)

export const numberRange: any = (from: number, to: number, key: string = ''): TypeValidator<number> => {
  if (!isNumber(from) || !isNumber(to)) { throw new TypeError('Params for numberRange must be numbers') }
  if (from >= to) { throw new TypeError('Params "to" should be bigger than "from"') }

  function numberRange (value, _scope = '') {
    number(value, _scope)
    if (value >= from && value <= to) return value
    throw validatorError(
      numberRange,
      value,
      _scope,
      key
        ? `number type '${key}' must be within the range of [${from}, ${to}]`
        : `must be within the range of [${from}, ${to}]`
    )
  }
  numberRange.type = `number(range: [${from}, ${to}])`
  return numberRange
}

export const string: any = (
  function string (value, _scope = '') {
    if (isEmpty(value)) return ''
    if (isString(value)) return value
    throw validatorError(string, value, _scope)
  } as TypeValidator<string>
)

export const stringMax: any = (numChar: number, key: string = ''): TypeValidator<string> => {
  if (!isNumber(numChar)) { throw new Error('param for stringMax must be number') }

  function stringMax (value, _scope = '') {
    string(value, _scope)
    if (value.length <= numChar) return value
    throw validatorError(
      stringMax,
      value,
      _scope,
      key
        ? `string type '${key}' cannot exceed ${numChar} characters`
        : `cannot exceed ${numChar} characters`
    )
  }
  stringMax.type = () => `string(max: ${numChar})`
  return stringMax
}

type V<T> = TypeValidator<T>
type TupleT =
    (<A>(a: V<A>) => TypeValidator<[A]>)
  & (<A, B>(a: V<A>, b: V<B>) => TypeValidator<[A, B]>)
  & (<A, B, C>(a: V<A>, b: V<B>, c: V<C>) => TypeValidator<[A, B, C]>)
  & (<A, B, C, D>(a: V<A>, b: V<B>, c: V<C>, d: V<D>) => TypeValidator<[A, B, C, D]>)
  & (<A, B, C, D, E>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>) => TypeValidator<[A, B, C, D, E]>)
  & (<A, B, C, D, E, F>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>) => TypeValidator<[A, B, C, D, E, F]>)
  & (<A, B, C, D, E, F, G>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>) => TypeValidator<[A, B, C, D, E, F, G]>)
  & (<A, B, C, D, E, F, G, H>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>, h: V<H>) => TypeValidator<[A, B, C, D, E, F, G, H]>)
  & (<A, B, C, D, E, F, G, H, I>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>, h: V<H>, i: V<I>) => TypeValidator<[A, B, C, D, E, F, G, H, I]>)
  & (<A, B, C, D, E, F, G, H, I, J>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>, h: V<H>, i: V<I>, j: V<J>) => TypeValidator<[A, B, C, D, E, F, G, H, I, J]>)

function tupleOf_ (...typeFuncs) {
  function tuple (value: unknown, _scope = '') {
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
export const tupleOf: any = tupleOf_

type UnionT =
    (<A>(a: V<A>) => TypeValidator<A>)
  & (<A, B>(a: V<A>, b: V<B>) => TypeValidator<A | B>)
  & (<A, B, C>(a: V<A>, b: V<B>, c: V<C>) => TypeValidator<A | B | C>)
  & (<A, B, C, D>(a: V<A>, b: V<B>, c: V<C>, d: V<D>) => TypeValidator<A | B | C | D>)
  & (<A, B, C, D, E>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>) => TypeValidator<A | B | C | D | E>)
  & (<A, B, C, D, E, F>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>) => TypeValidator<A | B | C | D | E | F>)
  & (<A, B, C, D, E, F, G>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>) => TypeValidator<A | B | C | D | E | F | G>)
  & (<A, B, C, D, E, F, G, H>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>, h: V<H>) => TypeValidator<A | B | C | D | E | F | G | H>)
  & (<A, B, C, D, E, F, G, H, I>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>, h: V<H>, i: V<I>) => TypeValidator<A | B | C | D | E | F | G | H | I>)
  & (<A, B, C, D, E, F, G, H, I, J>(a: V<A>, b: V<B>, c: V<C>, d: V<D>, e: V<E>, f: V<F>, g: V<G>, h: V<H>, i: V<I>, j: V<J>) => TypeValidator<A | B | C | D | E | F | G | H | I | J>)

function unionOf_ (...typeFuncs) {
  function union (value: unknown, _scope = '') {
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
export const unionOf: any = unionOf_

export const actionRequireInnerSignature: any = (next: Function): Function => (data, props) => {
  const innerSigningContractID = props.message.innerSigningContractID
  if (!innerSigningContractID || innerSigningContractID === props.contractID) {
    throw new Error('Missing inner signature')
  }
  return next(data, props)
}
export const validatorFrom: any = (fn) => {
  function customType (value: unknown, _scope = '') {
    if (!fn(value)) {
      throw validatorError(customType, value, _scope)
    }
    return value
  }
  return customType
}
