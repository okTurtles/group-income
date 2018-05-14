'use strict'

type TypeFilter = (domain: string, selector: string, data: any) => ?boolean

var selectors: {[string]: Function} = {}
var globalFilters: Array<TypeFilter> = []
var domainFilters: {[string]: Array<TypeFilter>} = {}
var selectorFilters: {[string]: Array<TypeFilter>} = {}
var pendingCalls: {[string]: Array<*>} = {} // allows sbp to be called regardless of module load order

const DOMAIN_REGEX = /^[^/]+/

function sbp (selector: string, ...data: any) {
  const domain = DOMAIN_REGEX.exec(selector)[0]
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
  return selectors[selector].call(domain, ...data)
}

const SBP_BASE_SELECTORS = {
  // During startup of app, use this instead of sbp function to call selectors
  // that haven't been registered yet. The selector gets run immediately
  // once it is registered via 'sbp/selectors/register'
  'sbp/ready': function (selector: string, ...data: any) {
    if (selectors[selector]) {
      return sbp(selector, ...data)
    }
    if (!pendingCalls[selector]) pendingCalls[selector] = []
    pendingCalls[selector].push(data)
  },
  'sbp/selectors/register': function (sels: {[string]: Function}) {
    for (const selector in sels) {
      if (selectors[selector]) {
        throw new Error(`already registered: ${selector}`)
      }
      selectors[selector] = sels[selector]
      // run any pendingCalls for this selector
      if (pendingCalls[selector]) {
        for (const data of pendingCalls[selector]) {
          sbp(selector, ...data)
        }
        delete pendingCalls[selector]
      }
    }
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
