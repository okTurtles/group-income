'use strict'

// Choosing the suggestions shown while typing a mention ('@user' or '#channel').

export type MentionCandidate = { item: Object, searchKeys: string[] }

const normalizeForMentionSearch = (str: string): string => str.normalize().toUpperCase()

// `names` are the strings a keyword is matched against (e.g., a member's
// username and display name). Missing names are ignored.
export const toMentionCandidate = (item: Object, names: Array<?string>): MentionCandidate => ({
  item,
  searchKeys: names.flatMap(name => typeof name === 'string' ? [normalizeForMentionSearch(name)] : [])
})

// The items of the candidates matching `keyword`, in order, up to `max`.
// `allCandidate` ('@all') is listed after the others, so that Enter / Tab (which
// pick the first suggestion) never notify everyone by default. Its place is
// reserved, so that the limit never drops it.
export const selectMentionOptions = (
  candidates: MentionCandidate[],
  allCandidate: ?MentionCandidate,
  keyword: string,
  max: number
): Object[] => {
  const normalKeyword = normalizeForMentionSearch(keyword)
  const matchesKeyword = ({ searchKeys }: MentionCandidate) => searchKeys.some(key => key.includes(normalKeyword))
  const includeAll = !!allCandidate && matchesKeyword(allCandidate)
  const limit = includeAll ? max - 1 : max
  const options = []
  for (const candidate of candidates) {
    if (options.length >= limit) break
    if (matchesKeyword(candidate)) options.push(candidate.item)
  }
  if (allCandidate && includeAll) options.push(allCandidate.item)
  return options
}
