/*
 * Copyright GitLab B.V.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * This file is mainly a copy of the `safe-html.js` directive found in the
 * [gitlab-ui](https://gitlab.com/gitlab-org/gitlab-ui) project,
 * slightly modifed for linting purposes and to immediately register it via
 * `Vue.directive()` rather than exporting it, consistently with our other
 * custom Vue directives.
 */

import dompurify from 'dompurify'
import Vue from 'vue'
import { cloneDeep } from '~/frontend/utils/giLodash.js'

// See https://github.com/cure53/DOMPurify#can-i-configure-dompurify
export const defaultConfig = {
  ALLOWED_ATTR: ['class'],
  ALLOWED_TAGS: ['b', 'br', 'em', 'i', 'p', 'small', 'span', 'strong', 'sub', 'sup', 'u'],
  // This option was in the original file.
  RETURN_DOM_FRAGMENT: true
}

const transform = (el, binding) => {
  if (binding.oldValue !== binding.value) {
    let config = defaultConfig
    if (binding.arg === 'a') {
      config = cloneDeep(config)
      config.ALLOWED_ATTR.push('href', 'target')
      config.ALLOWED_TAGS.push('a')
    }
    el.textContent = ''
    el.appendChild(dompurify.sanitize(binding.value, config))
  }
}

/*
 * Register a global custom directive called `v-safe-html`.
 *
 * Please use this instead of `v-html` everywhere user input is expected,
 *   in order to avoid XSS vulnerabilities.
 *
 * See https://github.com/okTurtles/group-income/issues/975
 */

Vue.directive('safe-html', {
  bind: transform,
  update: transform
})
