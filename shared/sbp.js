'use strict'

import {
  EVENTS,
  DATA
} from './domains'

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

function sbp (path: string, ...data: any) {
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
  console.log(domain.selectors)
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
sbp.ready = function (path: string, ...data: any) {
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

sbp.init = function (env) {
  if (env !== 'production') {
    sbp.addGlobalFilter((domain, sel, data) => {
      console.log(`[sbp] CALL: ${domain}${sel}:`, data)
    })
  }
  sbp.registerDomain('data', DATA)
  sbp.registerDomain('events', EVENTS)
}

export default sbp
