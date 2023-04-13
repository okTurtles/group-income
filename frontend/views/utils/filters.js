export const toPercent = (decimal: number): number => Math.floor(decimal * 100)

/**
 * this function filters `list` by `keyword`
 * `list` should be an array of objects and strings
 * if it's an array of objects, `keys` could be used to specify fields
 */
export const filterByKeyword = (
  list: Object,
  keyword: string,
  keys: Object = [],
  caseSensitive: boolean = false
): Object => {
  if (!Array.isArray(list) || typeof keyword !== 'string') { return [] }

  if (!keyword) {
    return list
  } else if (!caseSensitive) {
    keyword = keyword.toUpperCase()
  }

  return list.filter(item => {
    const values = (typeof item === 'object' ? keys.map(key => item[key]) : [item])
      .filter(value => value !== undefined && value !== null)

    for (let value of values) {
      if (!caseSensitive) {
        value = String(value).toUpperCase()
      }
      if (value.indexOf(keyword) > -1) {
        return true
      }
    }
    return false
  })
}
