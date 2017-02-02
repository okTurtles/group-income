// Handy reading on ES6 classes:
// http://www.benmvp.com/learning-es6-classes/
// https://www.sitepoint.com/object-oriented-javascript-deep-dive-es6-classes/

import type {Entry} from '../../../../shared/types'

export class Backend {
  publishLogEntry (groupId: string, entry: Entry, hash?: string) {}
  subscribe (groupId: string) {}
  unsubscribe (groupId: string) {}
  subscriptions () {}
}
