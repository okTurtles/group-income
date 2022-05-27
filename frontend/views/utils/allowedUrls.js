import {
  Vue
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

/**
 * Table of all well-known safe URLs used in the app UI.
 *
 * - Use it e.g. to avoid typing URLs.
 * - It has been frozen as an extra safety measure, to prevent any alteration even in case of a bug.
 */
const ALLOWED_URLS: Object = Object.freeze(Object.fromEntries([
  ['ISSUE_PAGE', 'https://github.com/okTurtles/group-income/issues'],
  ['BLOG_PAGE', 'https://groupincome.org/blog'],
  ['DONATE_PAGE', 'https://groupincome.org/donate'],
  ['FAQ_PAGE', 'https://groupincome.org/faq']
]))

Vue.prototype.ALLOWED_URLS = ALLOWED_URLS

export default ALLOWED_URLS
