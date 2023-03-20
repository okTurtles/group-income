export const filterByKeyword = (list, keyword, keys, caseSensitive = false) => {
  if (!Array.isArray(list) || typeof keyword !== 'string') { return [] }

  if (!keyword) {
    return list
  } else if (!caseSensitive) {
    keyword = keyword.toUpperCase()
  }

  const isMatched = (n) => {
    if (!caseSensitive) { n = n.toUpperCase() }
    return n.indexOf(keyword) > -1
  }
  return list.filter(item => {
    const values = (typeof item === 'object' ? keys.map(key => item[key]) : [item])
      .filter(value => value !== undefined && value !== null)

    for (const value of values) {
      if (isMatched(String(value))) { return true }
    }
    return false
  })
}
