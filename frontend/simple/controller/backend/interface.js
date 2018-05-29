// Handy reading on ES6 classes:
// http://www.benmvp.com/learning-es6-classes/
// https://www.sitepoint.com/object-oriented-javascript-deep-dive-es6-classes/

import {HashableEntry} from '../../../../shared/events'

export class Backend {
  publishLogEntry (contractId: string, entry: HashableEntry) {}
  subscribe (contractId: string) {}
  unsubscribe (contractId: string) {}
  subscriptions () {}
}

// this is the Group Income namespace
export class TrustedNamespace {
  // prefix groups with `group/` and users with `user/`
  register (name: string, value: string) {}
  lookup (name: string) {}
}
