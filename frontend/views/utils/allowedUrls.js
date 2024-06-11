import { Vue } from '@common/common.js'

/**
 * Table of all well-known safe URLs used in the app UI.
 *
 * - Use it e.g. to avoid typing URLs.
 * - It has been frozen as an extra safety measure, to prevent any alteration even in case of a bug.
 */
const ALLOWED_URLS: Object = Object.freeze(Object.fromEntries([
  ['OKTURTLES_PAGE', 'https://okturtles.org'],
  ['OKTURTLES_SUPPORT_PAGE', 'https://okturtles.org/donate'],
  ['ISSUE_PAGE', 'https://github.com/okTurtles/group-income/issues'],
  ['BLOG_PAGE', 'https://groupincome.org/blog'],
  ['DONATE_PAGE', 'https://groupincome.org/donate'],
  ['FAQ_PAGE', 'https://groupincome.org/faq'],
  ['COMMUNITY_PAGE', 'https://groupincome.org/community'],
  ['TERMS_PAGE', 'https://groupincome.org/terms-and-conditions'],
  ['WIKIPEDIA_DUNBARS_NUMBER', "https://en.wikipedia.org/wiki/Dunbar's_number"]
]))

Vue.prototype.ALLOWED_URLS = ALLOWED_URLS

export default ALLOWED_URLS
