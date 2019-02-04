/* eslint-env mocha */
import * as _ from './giLodash.js'
import sinon from 'sinon'
require('should-sinon')
const should = require('should')

describe('Test giLodash', function () {
  it('Test debounce', function () {
    let clock = sinon.useFakeTimers()
    let callback = sinon.spy()
    let callback2 = sinon.spy()
    let debounced = _.debounce(callback, 500)
    let debounced2 = _.debounce(callback2, 500)
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
  it('Test merge', function () {
    let a = { a: 'taco', b: { a: 'burrito', b: 'combo' }, c: [20] }
    let b = { a: 'churro', b: { c: 'platter' } }
    let c = _.merge(a, b)
    should(c).deepEqual({ a: 'churro', b: { a: 'burrito', b: 'combo', c: 'platter' }, c: [20] })
  })
  it('Test flatten', function () {
    let a = [1, [2, [3, 4]], 5]
    let b = _.flatten(a)
    should(b).deepEqual([1, 2, [3, 4], 5]) // important: use deepEqual not equal
  })
  it('Test zip', function () {
    let a = _.zip([1, 2], ['a', 'b'], [true, false, null])
    let b = _.zip([ '/foo/bar/node_modules/vue/dist/vue.common.js' ])
    let c = _.zip([ '/foo/bar/node_modules/vue/dist/vue.common.js' ], [])
    should(a).deepEqual([[1, 'a', true], [2, 'b', false], [undefined, undefined, null]])
    should(b).deepEqual([[ '/foo/bar/node_modules/vue/dist/vue.common.js' ]])
    should(b).deepEqual([[ '/foo/bar/node_modules/vue/dist/vue.common.js' ]])
    should(c).deepEqual([ [ '/foo/bar/node_modules/vue/dist/vue.common.js', undefined ] ])
  })
  it('Test fromPairs', function () {
    let a = _.fromPairs([['a', 1], ['b', 2]])
    should(a.a).equal(1)
    should(a.b).equal(2)
  })
})
