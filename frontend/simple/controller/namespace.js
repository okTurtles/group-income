/* global fetch */
'use strict'

import sbp from '../../../shared/sbp.js'
import {handleFetchResult} from './utils/misc.js'

// NOTE: prefix groups with `group/` and users with `user/` ?
sbp('sbp/selectors/register', {
  'namespace/register': (name: string, value: string) => {
    return fetch(`${process.env.API_URL}/name`, {
      method: 'POST',
      body: JSON.stringify({name, value}),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(handleFetchResult('json'))
  },
  'namespace/lookup': (name: string) => {
    // TODO: should `name` be encodeURI'd?
    return fetch(`${process.env.API_URL}/name/${name}`).then(handleFetchResult('text'))
  }
})
