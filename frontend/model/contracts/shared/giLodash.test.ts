// Can run directly with:
// deno test --import-map=import-map.json frontend/model/contracts/shared/giLodash.test.ts

/* globals Deno */
/* eslint require-await: "off" */

import { assertEquals, assertThrows } from 'asserts'
import sinon from 'sinon'

import * as _ from './giLodash.js'

Deno.test('Tests for giLodash', async function (tests) {
  await tests.step('should debounce', async function () {
    const clock = sinon.useFakeTimers()
    const callback = sinon.spy()
    const callback2 = sinon.spy()
    const debounced = _.debounce(callback, 500, false)
    const debounced2 = _.debounce(callback2, 500, false)
    debounced()
    clock.tick(400)
    assertEquals(callback.called, false)
    debounced()
    clock.tick(400)
    assertEquals(callback.called, false)
    clock.tick(400)
    assertEquals(callback.called, true)
    debounced()
    clock.tick(200)
    assertEquals(callback.getCalls().length, 1)
    clock.tick(300)
    assertEquals(callback.getCalls().length, 2)
    debounced2()
    debounced2()
    debounced2.flush()
    assertEquals(callback2.getCalls().length, 1)
    debounced2()
    clock.tick(450)
    debounced2.clear()
    assertEquals(callback2.getCalls().length, 1)
    clock.restore()
  })
  await tests.step('should choose', async function () {
    const a = _.choose([7, 3, 9, [0], 1], [0, 3])
    assertEquals(a, [7, [0]])
  })
  await tests.step('should mapObject', async function () {
    assertEquals(_.mapObject({
      foo: 5,
      bar: 'asdf'
    }, ([key, value]: [string, unknown]) => {
      return [`process.env.${key}`, JSON.stringify(value)]
    }), {
      'process.env.foo': '5',
      'process.env.bar': '"asdf"'
    })
  })
  await tests.step('should merge', async function () {
    const a = { a: 'taco', b: { a: 'burrito', b: 'combo' }, c: [20] }
    const b = { a: 'churro', b: { c: 'platter' } }
    const c = _.merge(a, b)
    assertEquals(c, { a: 'churro', b: { a: 'burrito', b: 'combo', c: 'platter' }, c: [20] })
  })
  await tests.step('should flatten', async function () {
    const a = [1, [2, [3, 4]], 5]
    const b = _.flatten(a)
    assertEquals(b, [1, 2, [3, 4], 5]) // important: use deepEqual not equal
  })
  await tests.step('should zip', async function () {
    const a = _.zip([1, 2], ['a', 'b'], [true, false, null])
    const b = _.zip(['/foo/bar/node_modules/vue/dist/vue.common.js'])
    const c = _.zip(['/foo/bar/node_modules/vue/dist/vue.common.js'], [])
    assertEquals(a, [[1, 'a', true], [2, 'b', false], [undefined, undefined, null]])
    assertEquals(b, [['/foo/bar/node_modules/vue/dist/vue.common.js']])
    assertEquals(b, [['/foo/bar/node_modules/vue/dist/vue.common.js']])
    assertEquals(c, [['/foo/bar/node_modules/vue/dist/vue.common.js', undefined]])
  })
  await tests.step('should deepEqual for JSON only', async function () {
    assertEquals(_.deepEqualJSONType(4, 4), true)
    assertEquals(_.deepEqualJSONType(4, 5), false)
    assertEquals(_.deepEqualJSONType(4, new Number(4)), false) // eslint-disable-line
    assertThrows(() => _.deepEqualJSONType(new Number(4), new Number(4))) // eslint-disable-line
    assertEquals(_.deepEqualJSONType('asdf', 'asdf'), true)
    assertThrows(() => _.deepEqualJSONType(new String('asdf'), new String('asdf'))) // eslint-disable-line
    assertEquals(_.deepEqualJSONType({ a: 5, b: ['adsf'] }, { b: ['adsf'], a: 5 }), true)
    assertEquals(_.deepEqualJSONType({ a: 5, b: ['adsf', {}] }, { b: ['adsf'], a: 5 }), false)
  })
})
