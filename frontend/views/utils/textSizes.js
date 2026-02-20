'use strict'
import { L } from '@common/common.js'

export type SizeOption = {
  value: number,
  alias: string,
  label: string
}

export const textSizeOptions: Array<SizeOption> = [
  {
    value: 14,
    alias: 'sm',
    label: L('Small')
  },
  {
    value: 16,
    alias: 'md',
    label: L('Medium')
  },
  {
    value: 18,
    alias: 'lg',
    label: L('Large')
  },
  {
    value: 20,
    alias: 'xl',
    label: L('Extra large')
  }
]

export function getTextSizeAlias (fontSize: number): string {
  const option = textSizeOptions.find((option: SizeOption): boolean => option.value === fontSize)
  return option ? option.alias : ''
}
