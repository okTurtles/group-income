export const filterByKeyword = (
  list: Object,
  keyword: string,
  keys: Object,
  caseSensitive: boolean = false
): Object => {
  if (!Array.isArray(list) || typeof keyword !== 'string') { return [] }

  if (!keyword) {
    return list
  } else if (!caseSensitive) {
    keyword = keyword.toUpperCase()
  }

  const isKeywordContained = (n) => {
    if (!caseSensitive) { n = n.toUpperCase() }
    return n.indexOf(keyword) > -1
  }
  return list.filter(item => {
    const values = (typeof item === 'object' ? keys.map(key => item[key]) : [item])
      .filter(value => value !== undefined && value !== null)

    for (const value of values) {
      if (isKeywordContained(String(value))) { return true }
    }
    return false
  })
}
