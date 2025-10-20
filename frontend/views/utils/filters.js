import { L } from '@common/common.js'
import { CHATROOM_ATTACHMENT_TYPES } from '@model/contracts/shared/constants.js'

export const toPercent = (decimal: number): number => Math.floor(decimal * 100)

export const getFileExtension = (
  name: string,
  toUppercase: boolean = false
): string => {
  const lastDotIndex = name.lastIndexOf('.')
  const ext = lastDotIndex === -1 ? '' : name.substring(lastDotIndex + 1)
  return toUppercase ? ext.toUpperCase() : ext.toLowerCase()
}

export const getFileType = (
  mimeType: string = ''
): string => {
  return mimeType.match('image/')
    ? CHATROOM_ATTACHMENT_TYPES.IMAGE
    : mimeType.match('video/')
      ? CHATROOM_ATTACHMENT_TYPES.VIDEO
      : CHATROOM_ATTACHMENT_TYPES.NON_MEDIA
}

export const formatBytesDecimal = (bytes: number, decimals: number = 2): string => {
  if (bytes < 0 || !Number.isFinite(bytes)) return L('Invalid size')
  else if (bytes === 0) return L('0 Bytes')

  const k = 1024 // Decimal base
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const formattedValue = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))
  return `${formattedValue} ${sizes[i]}`
}

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
