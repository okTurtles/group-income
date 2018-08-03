import L from './translations'
import template from 'string-template'

// TODO in the future the L function itself will do the template expansion,
// and we'll get rid of 'string-template' dependency.
export const mixinL = {
  methods: {
    L (text, opts = {}) {
      return template(L(text), opts)
    }
  }
}
