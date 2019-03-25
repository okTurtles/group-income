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
  // can prevent the execution of a selector.
  // TODO: decide whether the order of filter calls should be reversed
  //       e.g. call the most specific filter before the more general filter
  for (let filters of [globalFilters, domainFilters[domain], selectorFilters[selector]]) {
    if (filters) {
      for (let filter of filters) {
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
      // TODO: debug log (using an SBP logging facility) if we're already registered
      if (!selectors[selector]) {
        selectors[selector] = sels[selector]
        registered.push(selector)
      } else {
        (console.warn || console.log)(`[SBP WARN]: not registering already registered selector: ${selector}`)
      }
    }
    return registered
  },
  'sbp/selectors/unregister': function (sels: [string]) {
    for (const selector of sels) {
      delete selectors[selector]
    }
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
