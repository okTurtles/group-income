// Table of all well-known safe URLs used in the app UI.
// The resulting object is frozen as an extra safety measure, to prevent any alteration even in case of a bug.
const urlsByKey = Object.freeze(Object.fromEntries([
  ['ISSUE_PAGE', 'https://github.com/okTurtles/group-income-simple/issues'],
  ['BLOG_PAGE', 'https://groupincome.org/blog'],
  ['DONATE_PAGE', 'https://groupincome.org/donate'],
  ['FAQ_PAGE', 'https://groupincome.org/faq]']
]))

export default function safeLinkTag (key: string): string {
  if (!Object.prototype.hasOwnProperty.call(urlsByKey, key)) {
    throw new Error(`Unknown URL key: ${key}`)
  }
  // Make sure to include `noopener` and `noreferrer` in the `rel` attribute,
  // to prevent reverse tabnabbing attacks.
  return `<a class="link" href="${urlsByKey[key]}" target="_blank" rel="noopener noreferrer">`
}
