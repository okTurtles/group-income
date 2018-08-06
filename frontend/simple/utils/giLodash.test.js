/* eslint-env mocha */
import * as _ from './giLodash'
import sinon from 'sinon'
require('should-sinon')
const should = require('should')

describe('Test giLodash', function () {
  it('Test debounce', function () {
    let clock = sinon.useFakeTimers()
    let callback = sinon.spy()
    let debounced = _.debounce(callback, 500)
    debounced()
    clock.tick(400)
    callback.should.be.not.called()
    debounced()
    clock.tick(100)
    callback.should.be.not.called()
    clock.tick(500)
    callback.should.be.called()
    clock.restore()
  })
  it('Test merge', function () {
    let a = {a: 'taco', b: {a: 'burrito', b: 'combo'}, c: [20]}
    let b = {a: 'churro', b: {c: 'platter'}}
    let c = _.merge(a, b)
    should(a).equal(c)
    should(c.a).equal('churro')
    should.exist(c.c)
    should(Array.isArray(c.c)).equal(true)
    should(c.b.c).equal('platter')
  })
  it('Test flatten', function () {
    let a = [1, [2, [3, 4]], 5]
    let b = _.flatten(a)
    should(a).not.equal(b)
    should(Array.isArray(b[1])).equal(false)
    should(Array.isArray(b[2])).equal(true)
    should(b.length).equal(4)
  })
  it('Test zip', function () {
    let a = _.zip([1, 2], ['a', 'b'], [true, false, null])
    should(a.length).equal(3)
    should(a[0][0]).equal(1)
    should(a[0][1]).equal('a')
    should(a[0][2]).equal(true)
    should(a[2][0]).equal(undefined)
    should(a[2][1]).equal(undefined)
    should(a[2][2]).equal(null)
  })
  it(' Test fromPairs', function () {
    let a = _.fromPairs([['a', 1], ['b', 2]])
    should(a.a).equal(1)
    should(a.b).equal(2)
  })
})
