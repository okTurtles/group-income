'use strict'

type TypeFilter = (domain: string, selector: string, data: any) => ?boolean

const selectors: {[string]: Function} = {}
const domainState: {[string]: Object} = {}
const globalFilters: Array<TypeFilter> = []
const domainFilters: {[string]: Array<TypeFilter>} = {}
const selectorFilters: {[string]: Array<TypeFilter>} = {}

const DOMAIN_REGEX = /^[^/]+/

function sbp (selector: string, ...data: any): any {
  const domainLookup = DOMAIN_REGEX.exec(selector)
  if (!selectors[selector]) {
    throw new Error(`SBP: selector not registered: ${selector}`)
  }
  const domain = domainLookup[0] // guaranteed to exist because of 'sbp/selectors/register'
  // Filters can perform additional functions, and by returning `false` they
  // can prevent the execution of a selector. Check the most specific filters first.
  for (const filters of [selectorFilters[selector], domainFilters[domain], globalFilters]) {
    if (filters) {
      for (const filter of filters) {
        if (filter(domain, selector, data) === false) return
      }
    }
  }
  return selectors[selector].call(domainState[domain], ...data)
}

const SBP_BASE_SELECTORS = {
  // TODO: consider making it so that selectors in a domain can only be registered in one go
  //       to prevent other code from later adding a selector to that domain and thereby
  //       having access to the domain state.
  'sbp/selectors/register': function (sels: {[string]: Function}) {
    const registered = []
    for (const selector in sels) {
      const domainLookup = DOMAIN_REGEX.exec(selector)
      if (domainLookup === null) {
        throw new Error(`SBP: selector missing domain: ${selector}`)
      }
      const domain = domainLookup[0]
      if (selectors[selector]) {
        (console.warn || console.log)(`[SBP WARN]: not registering already registered selector: ${selector}`)
      } else if (typeof sels[selector] === 'function') {
        const fn = selectors[selector] = sels[selector]
        registered.push(selector)
        // ensure each domain has a domain state associated with it
        if (!domainState[domain]) {
          domainState[domain] = {}
        }
        // call the special _init function immediately upon registering
        if (selector === `${domain}/_init`) {
          fn.call(domainState[domain])
        }
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
