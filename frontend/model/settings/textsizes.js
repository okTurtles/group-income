import { L } from '@common/common.js'

export const sizeOptions = [
  {
    value: 14,
    label: L('Small'),
    alias: 'sm'
  },
  {
    value: 16,
    label: L('Medium'),
    alias: 'md'
  },
  {
    value: 18,
    label: L('Large'),
    alias: 'lg'
  },
  {
    value: 20,
    label: L('Extra large'),
    alias: 'xl'
  }
]

export const getTextSizeAlias = (fontSize) => {
  return sizeOptions.find(option => option.value === fontSize)?.alias || ''
}
