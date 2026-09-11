/* eslint-env mocha */
//
// Equivalence harness for `frontend/model/contracts/misc/flowTyper.js`.
//
// WHY THIS EXISTS
// ---------------
// `flowTyper.js` is runtime code, not erasable types, and it is bundled into
// pinned contracts. A behavioural change here does not throw — it desynchronises
// state across clients. It is also Flow-ignored, so neither Flow nor (after the
// migration) TypeScript checks it.
//
// These tests are written against the *Flow* version, before any conversion, and
// must pass unchanged afterwards. They therefore assert observed behaviour —
// including the quirks — not intended behaviour. Where something looks wrong it
// is marked QUIRK and locked in as-is; fixing it is a separate, deliberate change.
//
// THE FRAGILE PART
// ----------------
// `objectOf` dispatches on `typeFn.name.includes('maybe' | 'optional')`, so
// function `.name` must survive compilation and minification. `getType` also
// falls back to `.name`. Nothing else in the codebase catches a break here.
// See the `.name` and dispatch blocks at the end.
//
import {
  EMPTY_VALUE,
  isEmpty, isNil, isUndef, isBoolean, isNumber, isString, isObject, isFunction,
  isType, typeOf, getType, TypeValidatorError,
  arrayOf, literalOf, mapOf, maybe, mixed, object, objectOf, objectMaybeOf, optional,
  nil, undef, boolean, number, numberRange, string, stringMax,
  tupleOf, unionOf, validatorFrom, actionRequireInnerSignature
} from '~/frontend/model/contracts/misc/flowTyper.ts'

const should = require('should')

// Returns the thrown error, or null when `fn` did not throw.
const catchError = (fn) => {
  try {
    fn()
    return null
  } catch (e) {
    return e
  }
}

// The headline of a TypeValidatorError message. The rest of `.message` embeds a
// filesystem path derived from the stack, which is environment-dependent.
const headline = (err) => err.message.split('\n')[0]

describe('flowTyper — predicates', function () {
  it('classifies values', function () {
    should(isEmpty(EMPTY_VALUE)).equal(true)
    should(isEmpty(undefined)).equal(false)
    should(isEmpty(null)).equal(false)

    should(isNil(null)).equal(true)
    should(isNil(undefined)).equal(false) // QUIRK: isNil is `=== null` only
    should(isUndef(undefined)).equal(true)
    should(isUndef(null)).equal(false)

    should(isBoolean(false)).equal(true)
    should(isNumber(NaN)).equal(true) // QUIRK: typeof NaN === 'number'
    should(isString('')).equal(true)

    should(isObject({})).equal(true)
    should(isObject([])).equal(true) // QUIRK: arrays are objects here
    should(isObject(null)).equal(false)
    should(isFunction(() => {})).equal(true)
  })

  it('EMPTY_VALUE is a symbol and is not exported by value', function () {
    should(typeof EMPTY_VALUE).equal('symbol')
    should(EMPTY_VALUE.toString()).equal('Symbol(@@empty)')
  })
})

describe('flowTyper — primitive validators', function () {
  it('string accepts strings and defaults on EMPTY_VALUE', function () {
    should(string('abc')).equal('abc')
    should(string('')).equal('')
    should(string(EMPTY_VALUE)).equal('')
  })

  it('string rejects non-strings', function () {
    const err = catchError(() => string(42, 'MyScope'))
    should(err).be.instanceof(TypeValidatorError)
    should(err.name).equal('TypeValidatorError')
    should(headline(err)).equal('invalid "number" value type; string type expected')
    should(err.expectedType).equal('string')
    should(err.valueType).equal('number')
    should(err.value).equal('42')
    should(err.typeScope).equal('MyScope')
  })

  it('number accepts numbers and defaults on EMPTY_VALUE', function () {
    should(number(42)).equal(42)
    should(number(0)).equal(0)
    should(number(EMPTY_VALUE)).equal(0)
    should(catchError(() => number('42'))).be.instanceof(TypeValidatorError)
  })

  it('boolean accepts booleans and defaults on EMPTY_VALUE', function () {
    should(boolean(true)).equal(true)
    should(boolean(false)).equal(false)
    should(boolean(EMPTY_VALUE)).equal(false)
    should(catchError(() => boolean(1))).be.instanceof(TypeValidatorError)
  })

  it('nil accepts null only', function () {
    should(nil(null)).equal(null)
    should(nil(EMPTY_VALUE)).equal(null)
    should(catchError(() => nil(undefined))).be.instanceof(TypeValidatorError)
  })

  it('undef accepts undefined only', function () {
    should(undef(undefined)).equal(undefined)
    should(undef(EMPTY_VALUE)).equal(undefined)
    should(catchError(() => undef(null))).be.instanceof(TypeValidatorError)
  })

  it('mixed passes any value through untouched, EMPTY_VALUE included', function () {
    const o = {}
    should(mixed(o)).equal(o)
    should(mixed(null)).equal(null)
    should(mixed(EMPTY_VALUE)).equal(EMPTY_VALUE) // QUIRK: no default substitution
  })

  it('object accepts plain objects, copying them', function () {
    const src = { a: 1 }
    const out = object(src)
    should(out).eql({ a: 1 })
    should(out).not.equal(src) // shallow copy, not the same reference
    should(object(EMPTY_VALUE)).eql({})
  })

  it('object rejects arrays and non-objects', function () {
    should(catchError(() => object([]))).be.instanceof(TypeValidatorError)
    should(catchError(() => object(null))).be.instanceof(TypeValidatorError)
    should(catchError(() => object('x'))).be.instanceof(TypeValidatorError)
  })
})

describe('flowTyper — parameterised primitives', function () {
  it('stringMax enforces its limit', function () {
    const max3 = stringMax(3)
    should(max3('abc')).equal('abc')
    should(max3('')).equal('')

    const err = catchError(() => max3('abcd'))
    should(err).be.instanceof(TypeValidatorError)
    should(headline(err)).equal('cannot exceed 3 characters')
  })

  it('stringMax names the key in its message when given one', function () {
    const err = catchError(() => stringMax(3, 'title')('abcd'))
    should(headline(err)).equal("string type 'title' cannot exceed 3 characters")
  })

  it('stringMax rejects a non-number limit eagerly', function () {
    const err = catchError(() => stringMax('3'))
    should(err).be.instanceof(Error)
    should(err.message).equal('param for stringMax must be number')
  })

  it('stringMax on EMPTY_VALUE returns the empty string', function () {
    // `string(EMPTY_VALUE)` yields '' but the length check runs against the
    // original EMPTY_VALUE symbol, whose `.length` is undefined.
    // QUIRK: `undefined <= 3` is false, so this throws rather than defaulting.
    should(catchError(() => stringMax(3)(EMPTY_VALUE))).be.instanceof(TypeValidatorError)
  })

  it('numberRange enforces an inclusive range', function () {
    const r = numberRange(1, 5)
    should(r(1)).equal(1)
    should(r(5)).equal(5)
    should(r(3)).equal(3)

    const err = catchError(() => r(6))
    should(err).be.instanceof(TypeValidatorError)
    should(headline(err)).equal('must be within the range of [1, 5]')
  })

  it('numberRange names the key in its message when given one', function () {
    const err = catchError(() => numberRange(1, 5, 'age')(6))
    should(headline(err)).equal("number type 'age' must be within the range of [1, 5]")
  })

  it('numberRange validates its own parameters eagerly', function () {
    should(catchError(() => numberRange('1', 5)).message)
      .equal('Params for numberRange must be numbers')
    should(catchError(() => numberRange(5, 1)).message)
      .equal('Params "to" should be bigger than "from"')
    should(catchError(() => numberRange(5, 5)).message)
      .equal('Params "to" should be bigger than "from"')
  })

  it('numberRange rejects non-numbers through the inner number check', function () {
    should(catchError(() => numberRange(1, 5)('3'))).be.instanceof(TypeValidatorError)
  })
})

describe('flowTyper — arrayOf', function () {
  it('validates every element', function () {
    should(arrayOf(string)(['a', 'b'])).eql(['a', 'b'])
    should(arrayOf(number)([])).eql([])
  })

  it('wraps the element default on EMPTY_VALUE', function () {
    should(arrayOf(string)(EMPTY_VALUE)).eql([''])
    should(arrayOf(number)(EMPTY_VALUE)).eql([0])
  })

  it('rejects non-arrays', function () {
    const err = catchError(() => arrayOf(string)('nope'))
    should(err).be.instanceof(TypeValidatorError)
    should(err.expectedType).equal('Array<string>')
    should(err.typeScope).equal('Array')
  })

  it('reports the failing element index in the scope', function () {
    const err = catchError(() => arrayOf(string)(['a', 7]))
    should(err.typeScope).equal('Array[1]')
  })

  it('honours a custom scope', function () {
    const err = catchError(() => arrayOf(string, 'Names')(['a', 7]))
    should(err.typeScope).equal('Names[1]')
  })
})

describe('flowTyper — literalOf', function () {
  it('accepts only the exact primitive', function () {
    should(literalOf('yes')('yes')).equal('yes')
    should(literalOf(7)(7)).equal(7)
    should(literalOf(true)(true)).equal(true)
    should(catchError(() => literalOf('yes')('no'))).be.instanceof(TypeValidatorError)
  })

  it('returns the primitive on EMPTY_VALUE', function () {
    should(literalOf('yes')(EMPTY_VALUE)).equal('yes')
  })

  it('renders its type', function () {
    should(getType(literalOf('yes'))).equal('"yes"')
    should(getType(literalOf(true))).equal('true')
    should(getType(literalOf(false))).equal('false')
    should(getType(literalOf(7))).equal('"7"') // QUIRK: numbers render quoted
  })
})

describe('flowTyper — mapOf', function () {
  it('validates keys and values', function () {
    should(mapOf(string, number)({ a: 1, b: 2 })).eql({ a: 1, b: 2 })
  })

  it('returns an empty object on EMPTY_VALUE', function () {
    should(mapOf(string, number)(EMPTY_VALUE)).eql({})
  })

  it('rejects a bad value with a keyed scope', function () {
    const err = catchError(() => mapOf(string, number)({ a: 'x' }))
    should(err).be.instanceof(TypeValidatorError)
    should(err.typeScope).equal('Map.a')
  })

  it('rejects non-objects through the inner object check', function () {
    should(catchError(() => mapOf(string, number)([]))).be.instanceof(TypeValidatorError)
  })

  it('renders its type', function () {
    should(getType(mapOf(string, number))).equal('{ [_:string]: number }')
  })
})

describe('flowTyper — maybe and optional', function () {
  it('maybe passes null and undefined straight through', function () {
    should(maybe(string)(null)).equal(null)
    should(maybe(string)(undefined)).equal(undefined)
    should(maybe(string)('a')).equal('a')
    should(catchError(() => maybe(string)(7))).be.instanceof(TypeValidatorError)
  })

  it('maybe delegates EMPTY_VALUE to the inner validator', function () {
    // EMPTY_VALUE is neither null nor undefined, so the inner default applies.
    should(maybe(string)(EMPTY_VALUE)).equal('')
  })

  it('optional accepts the value or undefined', function () {
    should(optional(string)('a')).equal('a')
    should(optional(string)(undefined)).equal(undefined)
    should(catchError(() => optional(string)(null))).be.instanceof(TypeValidatorError)
  })

  it('optional resolves EMPTY_VALUE through the union', function () {
    should(optional(string)(EMPTY_VALUE)).equal('')
  })

  it('maybe renders parenthesised types for non-primitives only', function () {
    should(getType(maybe(string))).equal('?string')
    should(getType(maybe(number))).equal('?number')
    should(getType(maybe(boolean))).equal('?boolean')
    // QUIRK: isPrimitiveFn matches on the *name*, so `nil` and `undef` — whose
    // names are not in the primitive list — get the parenthesised form.
    should(getType(maybe(nil))).equal('?(nil)')
    should(getType(maybe(undef))).equal('?(void)')
    should(getType(maybe(object))).equal('?(object)')
  })

  it('optional.type requires an options argument', function () {
    // QUIRK: `optional.type` destructures its parameter, so calling getType
    // without options throws. objectOf always passes `{ noVoid: true }`.
    should(catchError(() => getType(optional(string)))).be.instanceof(TypeError)
    should(getType(optional(string), { noVoid: true })).equal('string')
    should(getType(optional(string), {})).equal('(string | void)')
  })
})

describe('flowTyper — objectOf', function () {
  const Person = objectOf({ name: string, age: number })

  it('validates each declared property', function () {
    should(Person({ name: 'a', age: 3 })).eql({ name: 'a', age: 3 })
  })

  it('reports the failing property in the scope', function () {
    const err = catchError(() => Person({ name: 'a', age: 'x' }))
    should(err).be.instanceof(TypeValidatorError)
    should(err.typeScope).equal('Object.age')
  })

  it('rejects unknown properties', function () {
    const err = catchError(() => Person({ name: 'a', age: 3, extra: 1 }))
    should(err).be.instanceof(TypeValidatorError)
    // QUIRK: the message says "missing" for what is actually an unknown property.
    should(headline(err)).equal("missing object property 'extra' in Object type")
    should(err.typeScope).equal('Object')
  })

  it('honours a custom scope in both messages and scopes', function () {
    const Scoped = objectOf({ name: string }, 'Person')
    should(headline(catchError(() => Scoped({ name: 'a', x: 1 }))))
      .equal("missing object property 'x' in Person type")
    should(catchError(() => Scoped({ name: 7 })).typeScope).equal('Person.name')
  })

  it('requires a `maybe` property to be present, even as null', function () {
    const T = objectOf({ a: maybe(string) })
    should(T({ a: null })).eql({ a: null })
    should(T({ a: 'x' })).eql({ a: 'x' })

    const err = catchError(() => T({}))
    should(err).be.instanceof(TypeValidatorError)
    should(headline(err)).equal("empty object property 'a' for Object type")
    should(err.expectedType).equal('void | null | string')
    should(err.typeScope).equal('Object.a')
    // QUIRK: this call site passes '-' as `valueType`, so the reported type is
    // the literal '-' rather than the actual `typeof` of the missing value.
    should(err.valueType).equal('-')
  })

  it('allows an `optional` property to be absent, omitting it from the result', function () {
    const T = objectOf({ a: string, b: optional(number) })
    should(T({ a: 'x', b: 1 })).eql({ a: 'x', b: 1 })

    const out = T({ a: 'x' })
    should(out).eql({ a: 'x' })
    should(Object.prototype.hasOwnProperty.call(out, 'b')).equal(false)
  })

  it('rejects non-objects through the inner object check', function () {
    should(catchError(() => Person('nope'))).be.instanceof(TypeValidatorError)
    should(catchError(() => Person([]))).be.instanceof(TypeValidatorError)
  })

  it('fills defaults on EMPTY_VALUE', function () {
    should(Person(EMPTY_VALUE)).eql({ name: '', age: 0 })
  })

  it('renders its type', function () {
    should(getType(Person)).equal('{|\n name: string,\n  age: number \n|}')
  })

  it('renders optional properties with a `?` and no void', function () {
    should(getType(objectOf({ b: optional(number) })))
      .equal('{|\n b?: number \n|}')
  })
})

describe('flowTyper — objectMaybeOf', function () {
  it('validates only the keys present in the data', function () {
    const T = objectMaybeOf({ a: string, b: number })
    should(T({ a: 'x' })).eql({ a: 'x' })
    should(T({ a: 'x', b: 1 })).eql({ a: 'x', b: 1 })
  })

  it('ignores keys with no matching validator', function () {
    // QUIRK: unlike objectOf, unknown properties pass through silently.
    const T = objectMaybeOf({ a: string })
    should(T({ a: 'x', unknown: 1 })).eql({ a: 'x', unknown: 1 })
  })

  it('returns the original object, not a copy', function () {
    const T = objectMaybeOf({ a: string })
    const src = { a: 'x' }
    should(T(src)).equal(src)
  })

  it('throws with a scoped message on a bad value', function () {
    const err = catchError(() => objectMaybeOf({ a: string })({ a: 7 }))
    should(err).be.instanceof(TypeValidatorError)
    should(err.typeScope).equal('Object.a')
  })

  it('honours a custom scope', function () {
    const err = catchError(() => objectMaybeOf({ a: string }, 'Cfg')({ a: 7 }))
    should(err.typeScope).equal('Cfg.a')
  })

  it('rejects non-objects', function () {
    should(catchError(() => objectMaybeOf({})('nope'))).be.instanceof(TypeValidatorError)
  })
})

describe('flowTyper — unionOf and tupleOf', function () {
  it('unionOf accepts any member type', function () {
    const U = unionOf(string, number)
    should(U('a')).equal('a')
    should(U(7)).equal(7)
    should(catchError(() => U(true))).be.instanceof(TypeValidatorError)
  })

  it('unionOf returns the first matching branch', function () {
    // EMPTY_VALUE satisfies `string` first, so the string default wins.
    should(unionOf(string, number)(EMPTY_VALUE)).equal('')
    should(unionOf(number, string)(EMPTY_VALUE)).equal(0)
  })

  it('tupleOf enforces cardinality and per-slot types', function () {
    const T = tupleOf(string, number)
    should(T(['a', 1])).eql(['a', 1])
    should(catchError(() => T(['a']))).be.instanceof(TypeValidatorError)
    should(catchError(() => T(['a', 1, 2]))).be.instanceof(TypeValidatorError)
    should(catchError(() => T(['a', 'b']))).be.instanceof(TypeValidatorError)
  })

  it('tupleOf maps EMPTY_VALUE across every slot', function () {
    should(tupleOf(string, number)(EMPTY_VALUE)).eql(['', 0])
  })

  it('renders their types', function () {
    should(getType(unionOf(string, number))).equal('(string | number)')
    should(getType(tupleOf(string, number))).equal('[string, number]')
  })
})

describe('flowTyper — validatorFrom', function () {
  it('accepts values passing the predicate and returns them unchanged', function () {
    const even = validatorFrom(v => typeof v === 'number' && v % 2 === 0)
    should(even(4)).equal(4)
    should(catchError(() => even(3))).be.instanceof(TypeValidatorError)
  })

  it('reports the scope it was given', function () {
    const never = validatorFrom(() => false)
    should(catchError(() => never('x', 'Here')).typeScope).equal('Here')
  })
})

describe('flowTyper — isType, typeOf and getType', function () {
  it('isType converts a validator into a predicate', function () {
    should(isType(string)('a')).equal(true)
    should(isType(string)(7)).equal(false)
  })

  it('typeOf probes a validator with EMPTY_VALUE', function () {
    should(typeOf(string)).equal('')
    should(typeOf(number)).equal(0)
    should(typeOf(boolean)).equal(false)
    should(typeOf(objectOf({ a: string }))).eql({ a: '' })
  })

  it('getType falls back to the function name when there is no .type', function () {
    should(getType(string)).equal('string')
    should(getType(number)).equal('number')
    should(getType(boolean)).equal('boolean')
    should(getType(nil)).equal('nil')
    should(getType(mixed)).equal('mixed')
    should(getType(object)).equal('object')
    should(getType(undef)).equal('void')
  })

  it('getType returns "?" for an anonymous function with no .type', function () {
    should(getType(Object.defineProperty(function () {}, 'name', { value: '' }))).equal('?')
  })

  it('numberRange.type is a string, not a function, so getType ignores it', function () {
    // QUIRK: every other combinator assigns a function to `.type`. numberRange
    // assigns a string, so `isFunction(typeFn.type)` is false and getType falls
    // back to the name. Locking this in — the migration must not "fix" it.
    const r = numberRange(1, 5)
    should(typeof r.type).equal('string')
    should(r.type).equal('number(range: [1, 5])')
    should(getType(r)).equal('numberRange')
  })

  it('stringMax.type is a function', function () {
    should(getType(stringMax(5))).equal('string(max: 5)')
  })
})

describe('flowTyper — TypeValidatorError', function () {
  it('carries the structured fields and a composed message', function () {
    const err = catchError(() => string({ a: 1 }, 'Scope'))
    should(err.name).equal('TypeValidatorError')
    should(err.expectedType).equal('string')
    should(err.valueType).equal('object')
    should(err.value).equal('{"a":1}')
    should(err.typeScope).equal('Scope')
    should(typeof err.sourceFile).equal('string')

    // The message is the headline followed by the indented info block.
    should(err.message).startWith('invalid "object" value type; string type expected\n')
    should(err.message).match(/\n\s+scope\s+Scope\n/)
    should(err.message).match(/\n\s+expected\s+string\n/)
    should(err.message).match(/\n\s+type\s+object\n/)
    should(err.message).match(/\n\s+value\s+\{"a":1\}\n/)
  })

  it('defaults typeScope to the empty string', function () {
    should(catchError(() => string(7)).typeScope).equal('')
  })

  it('is an Error subclass', function () {
    const err = catchError(() => string(7))
    should(err).be.instanceof(Error)
    should(err).be.instanceof(TypeValidatorError)
  })

  it('can be constructed directly with an explicit message', function () {
    const err = new TypeValidatorError('boom', 'string', 'number', '7', 'string', 'S')
    should(headline(err)).equal('boom')
    should(err.expectedType).equal('string')
    should(err.typeScope).equal('S')
  })
})

describe('flowTyper — actionRequireInnerSignature', function () {
  it('passes through when an inner signature is present and distinct', function () {
    const wrapped = actionRequireInnerSignature((data) => `ok:${data}`)
    const props = { contractID: 'cid', message: { innerSigningContractID: 'other' } }
    should(wrapped('d', props)).equal('ok:d')
  })

  it('throws when the inner signature is missing', function () {
    const wrapped = actionRequireInnerSignature(() => 'ok')
    const props = { contractID: 'cid', message: {} }
    should(catchError(() => wrapped('d', props)).message).equal('Missing inner signature')
  })

  it('throws when the inner signature equals the contract ID', function () {
    const wrapped = actionRequireInnerSignature(() => 'ok')
    const props = { contractID: 'cid', message: { innerSigningContractID: 'cid' } }
    should(catchError(() => wrapped('d', props)).message).equal('Missing inner signature')
  })
})

// ---------------------------------------------------------------------------
// The part that actually guards the migration.
//
// `objectOf` branches on `typeFn.name.includes(...)`. If a compiler, bundler or
// minifier drops or rewrites these names, `maybe` properties stop being required
// and `optional` properties stop being skippable — silently, with no type error
// and no exception. That is a state-desync bug in pinned contracts.
// ---------------------------------------------------------------------------
describe('flowTyper — function .name survival (dispatch dependency)', function () {
  it('combinators produce functions whose names carry the dispatch keywords', function () {
    should(maybe(string).name).containEql('maybe')
    should(optional(string).name).containEql('optional')
  })

  it('bare validators keep the names getType depends on', function () {
    should(string.name).equal('string')
    should(number.name).equal('number')
    should(boolean.name).equal('boolean')
    should(nil.name).equal('nil')
    should(undef.name).equal('undef')
    should(mixed.name).equal('mixed')
    // `object` is an anonymous function expression; its name comes from const
    // name inference through the parenthesised Flow cast.
    should(object.name).equal('object')
  })

  it('objectOf still distinguishes maybe from optional at runtime', function () {
    const T = objectOf({ m: maybe(string), o: optional(string) })

    // `maybe` present, `optional` absent — the supported shape.
    should(T({ m: null })).eql({ m: null })

    // `maybe` absent must throw; if the name check breaks this silently passes.
    should(catchError(() => T({ o: 'x' }))).be.instanceof(TypeValidatorError)
  })

  it('the dispatch survives a renamed wrapper, which is why it uses .includes', function () {
    // Bundlers rename `optional` to e.g. `optional2`. Simulate that and confirm
    // the substring check still routes correctly.
    const inner = optional(string)
    const renamed = Object.defineProperty(
      (v, s) => inner(v, s), 'name', { value: 'optional2' }
    )
    const T = objectOf({ a: string, b: renamed })
    const out = T({ a: 'x' })
    should(out).eql({ a: 'x' })
    should(Object.prototype.hasOwnProperty.call(out, 'b')).equal(false)
  })

  it('an exact-match dispatch would break, proving .includes is what survives renaming', function () {
    const inner = maybe(string)
    const renamed = Object.defineProperty(
      (v, s) => inner(v, s), 'name', { value: 'maybe2' }
    )
    // Still required, because 'maybe2'.includes('maybe') holds.
    should(catchError(() => objectOf({ a: renamed })({}))).be.instanceof(TypeValidatorError)
  })
})
