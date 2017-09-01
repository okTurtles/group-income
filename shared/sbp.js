'use strict'

type TypeFilter = (domain: string, selector: string, data: Array<*>) => ?boolean
type TypeDomain = {
  selectors: {[string]: Function},
  domainFilters: Array<TypeFilter>,
  selectorFilters: {[string]: TypeFilter},
  data: Object
}

var domains: {[string]: TypeDomain} = {}
var globalFilters: Array<TypeFilter> = []
var pendingCalls = {} // allows sbp to be called regardless of module load order

const DOMAIN_SELECTOR_REGEX = /^([^/]+)(.+)/

function sbp (path: string, ...data?: Array<*>) {
  var [, name, selector] = DOMAIN_SELECTOR_REGEX.exec(path)
  var domain = domains[name]
  // Filters can perform additional functions, and by returning `false` they
  // can prevent the execution of a selector.
  for (let gf of globalFilters) {
    if (gf(name, selector, data) === false) return
  }
  for (let df of domain.domainFilters) {
    if (df(name, selector, data) === false) return
  }
  var sf = domain.selectorFilters[selector]
  if (sf && sf(name, selector, data) === false) return
  return domain.selectors[selector].call(domain, ...data)
}

sbp.registerDomain = function (domain: string, selectors: {[string]: Function}) {
  if (domains[domain]) throw new Error(`${domain} exists`)
  domains[domain] = {selectors, data: {}, domainFilters: [], selectorFilters: {}}
  // run any pendingCalls for this domain
  if (pendingCalls[domain]) {
    for (var [path, data] of pendingCalls[domain]) {
      sbp(path, ...data)
    }
    delete pendingCalls[domain]
  }
}

// During startup of app, use this instead of sbp function to call selectors
// on domains that haven't been registered yet. The selector gets run immediately
// once the corresponding domain is registered via registerDomain.
sbp.ready = function (path: string, ...data?: Array<*>) {
  // a call might happen to a selector for domains that haven't been registered
  // yet, due to module load order. So we save them and run them later.
  var [, domain] = DOMAIN_SELECTOR_REGEX.exec(path)
  if (domains[domain]) return sbp(path, ...data) // call if already available
  if (!pendingCalls[domain]) pendingCalls[domain] = []
  pendingCalls[domain].push([path, data])
}

sbp.addDomainFilter = function (domain: string, filter: TypeFilter) {
  domains[domain].domainFilters.push(filter)
}

sbp.setSelectorFilter = function (domain: string, selector: string, filter: TypeFilter) {
  if (domains[domain].selectorFilters[selector]) {
    throw new Error(`${domain}/${selector} filter exists`)
  }
  domains[domain].selectorFilters[selector] = filter
}

sbp.addGlobalFilter = function (filter: TypeFilter) {
  globalFilters.push(filter)
}

export default sbp

// =======================
// Common selectors APIs
// TODO: move to a separate file
// =======================

function addListener (event: string, handler: Function, type: 'listeners' | 'listenOnce') {
  if (!this.data.events) {
    this.data.events = {}
  }
  if (!this.data.events[event]) {
    this.data.events[event] = {listeners: [], listenOnce: []}
  }
  this.data.events[event][type].push(handler)
}

const COMMON_MIXINS = {
  V1: {
    EVENTS: {
      // TODO: add ability to unregister listeners
      '/v1/events/on': function (event, data) {
        addListener.call(this, event, data, 'listeners')
      },
      '/v1/events/once': function (event, data) {
        addListener.call(this, event, data, 'listenOnce')
      },
      '/v1/events/emit': function (event, data) {
        if (!this.data.events) return
        for (let listener of this.data.events[event].listeners) {
          listener({event, data})
        }
        for (let listener of this.data.events[event].listenOnce) {
          listener({event, data})
        }
        this.data.events[event].listenOnce = []
      }
    }
  }
}

sbp.COMMON_MIXINS = COMMON_MIXINS
