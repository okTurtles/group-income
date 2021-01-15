/* eslint-env mocha */
import * as _ from './giLodash.js'
import sinon from 'sinon'
require('should-sinon')
const should = require('should')

describe('Test giLodash', function () {
  it('should debounce', function () {
    const clock = sinon.useFakeTimers()
    const callback = sinon.spy()
    const callback2 = sinon.spy()
    const debounced = _.debounce(callback, 500)
    const debounced2 = _.debounce(callback2, 500)
    debounced()
    clock.tick(400)
    callback.should.be.not.called()
    debounced()
    clock.tick(400)
    callback.should.be.not.called()
    clock.tick(400)
    callback.should.be.called()
    debounced()
    clock.tick(200)
    callback.should.be.not.calledTwice()
    clock.tick(300)
    callback.should.be.calledTwice()
    debounced2()
    debounced2()
    debounced2.flush()
    callback2.should.be.calledOnce()
    debounced2()
    clock.tick(450)
    debounced2.cancel()
    callback2.should.be.calledOnce()
    clock.restore()
  })
  it('should mapObject', function () {
    should(_.mapObject({
      foo: 5,
      bar: 'asdf'
    }, ([key, value]) => {
      return [`process.env.${key}`, JSON.stringify(value)]
    })).deepEqual({
      'process.env.foo': '5',
      'process.env.bar': '"asdf"'
    })
  })
  it('should merge', function () {
    const a = { a: 'taco', b: { a: 'burrito', b: 'combo' }, c: [20] }
    const b = { a: 'churro', b: { c: 'platter' } }
    const c = _.merge(a, b)
    should(c).deepEqual({ a: 'churro', b: { a: 'burrito', b: 'combo', c: 'platter' }, c: [20] })
  })
  it('should flatten', function () {
    const a = [1, [2, [3, 4]], 5]
    const b = _.flatten(a)
    should(b).deepEqual([1, 2, [3, 4], 5]) // important: use deepEqual not equal
  })
  it('should zip', function () {
    const a = _.zip([1, 2], ['a', 'b'], [true, false, null])
    const b = _.zip(['/foo/bar/node_modules/vue/dist/vue.common.js'])
    const c = _.zip(['/foo/bar/node_modules/vue/dist/vue.common.js'], [])
    should(a).deepEqual([[1, 'a', true], [2, 'b', false], [undefined, undefined, null]])
    should(b).deepEqual([['/foo/bar/node_modules/vue/dist/vue.common.js']])
    should(b).deepEqual([['/foo/bar/node_modules/vue/dist/vue.common.js']])
    should(c).deepEqual([['/foo/bar/node_modules/vue/dist/vue.common.js', undefined]])
  })
  it('should deepEqual for JSON only', function () {
    should(_.deepEqualJSONType(4, 4)).be.true()
    should(_.deepEqualJSONType(4, 5)).be.false()
    should(_.deepEqualJSONType(4, new Number(4))).be.false() // eslint-disable-line
    should(() => _.deepEqualJSONType(new Number(4), new Number(4))).throw() // eslint-disable-line
    should(_.deepEqualJSONType('asdf', 'asdf')).be.true()
    should(() => _.deepEqualJSONType(new String('asdf'), new String('asdf'))).throw() // eslint-disable-line
    should(_.deepEqualJSONType({ a: 5, b: ['adsf'] }, { b: ['adsf'], a: 5 })).be.true()
    should(_.deepEqualJSONType({ a: 5, b: ['adsf', {}] }, { b: ['adsf'], a: 5 })).be.false()
  })
})
