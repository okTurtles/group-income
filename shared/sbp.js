'use strict'

type TypeFilter = (domain: string, selector: string, data: any) => ?boolean

var selectors: {[string]: Function} = {}
var globalFilters: Array<TypeFilter> = []
var domainFilters: {[string]: Array<TypeFilter>} = {}
var selectorFilters: {[string]: Array<TypeFilter>} = {}

const DOMAIN_REGEX = /^[^/]+/

function sbp (selector: string, ...data: any): any {
  const domainLookup = DOMAIN_REGEX.exec(selector)
  if (domainLookup === null) return
  const domain = domainLookup[0]
  // Filters can perform additional functions, and by returning `false` they
  // can prevent the execution of a selector. Check the most specific filters first.
  for (const filters of [selectorFilters[selector], domainFilters[domain], globalFilters]) {
    if (filters) {
      for (const filter of filters) {
        if (filter(domain, selector, data) === false) return
      }
    }
  }
  return selectors[selector](...data)
}

const SBP_BASE_SELECTORS = {
  'sbp/selectors/register': function (sels: {[string]: Function}) {
    var registered = []
    for (const selector in sels) {
      if (selectors[selector]) {
        (console.warn || console.log)(`[SBP WARN]: not registering already registered selector: ${selector}`)
      } else if (typeof sels[selector] === 'function') {
        selectors[selector] = sels[selector]
        registered.push(selector)
      }
    }
    return registered
  },
  'sbp/selectors/unregister': function (sels: [string]) {
    for (const selector of sels) {
      delete selectors[selector]
    }
  },
  'sbp/selectors/overwrite': function (sels: {[string]: Function}) {
    sbp('sbp/selectors/unregister', Object.keys(sels))
    return sbp('sbp/selectors/register', sels)
  },
  'sbp/selectors/fn': function (sel: string): Function {
    return selectors[sel]
  },
  'sbp/filters/global/add': function (filter: TypeFilter) {
    globalFilters.push(filter)
  },
  'sbp/filters/domain/add': function (domain: string, filter: TypeFilter) {
    if (!domainFilters[domain]) domainFilters[domain] = []
    domainFilters[domain].push(filter)
  },
  'sbp/filters/selector/add': function (selector: string, filter: TypeFilter) {
    if (!selectorFilters[selector]) selectorFilters[selector] = []
    selectorFilters[selector].push(filter)
  }
}

SBP_BASE_SELECTORS['sbp/selectors/register'](SBP_BASE_SELECTORS)

export default sbp
