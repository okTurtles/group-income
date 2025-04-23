import dompurify from 'dompurify'
import Vue from 'vue'
import { cloneDeep } from 'turtledash'

const dompurifyDefaultConfig = {
  ALLOWED_ATTR: ['class'],
  ALLOWED_TAGS: ['b', 'br', 'em', 'i', 'p', 'small', 'span', 'strong', 'sub', 'sup', 'u', 's', 'code', 'ul', 'li', 'pre', 'blockquote', 'del'],
  // This option was in the original file.
  RETURN_DOM_FRAGMENT: true
}

const sanitize = (el, binding) => {
  if (binding.oldValue !== binding.value) {
    let config = dompurifyDefaultConfig
    const allowedTagsAttrs = {
      'a': ['href', 'target'],
      'button': ['type']
    }

    if (Object.keys(allowedTagsAttrs).includes(binding.arg)) {
      config = cloneDeep(config)
      config.ALLOWED_TAGS.push(binding.arg)
      config.ALLOWED_ATTR.push(...(allowedTagsAttrs[binding.arg] || []))
    }

    el.textContent = ''
    el.appendChild(dompurify.sanitize(binding.value, config))
  }
}

Vue.directive('safe-html', {
  bind: sanitize,
  update: sanitize
})
