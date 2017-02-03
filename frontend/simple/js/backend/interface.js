// Handy reading on ES6 classes:
// http://www.benmvp.com/learning-es6-classes/
// https://www.sitepoint.com/object-oriented-javascript-deep-dive-es6-classes/

import {HashableEntry} from '../../../../shared/events'

export class Backend {
  publishLogEntry (groupId: string, entry: HashableEntry) {}
  subscribe (groupId: string) {}
  unsubscribe (groupId: string) {}
  subscriptions () {}
}
