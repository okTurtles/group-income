'use strict'

import fs from 'fs'
import path from 'path'
import util from 'util'

import sbp from '~/shared/sbp.js'

const readFileAsync = util.promisify(fs.readFile)

const defaultLanguage = 'en-US'
const languageDir = path.resolve('./strings')
const languageFileExtension = '.json'
const languageFileMap = new Map([
  ['en', 'english.json'],
  ['fr', 'french.json']
])

export default sbp('sbp/selectors/register', {
  'backend/translations/get': async function (language: string): Promise<string> {
    if (language === defaultLanguage) return ''
    const [languageCode] = language.toLowerCase().split('-')
    const fileName = languageFileMap.get(languageCode) || ''

    // If we don't have a matching file yet,
    // returns empty so that the UI stays in the default language.
    if (!fileName || !fileName.endsWith(languageFileExtension)) return ''
    const filePath = path.join(languageDir, fileName)
    try {
      return await readFileAsync(filePath)
    } catch (error) {
      throw new Error(`No translation file was found for language ${language}.`)
    }
  }
})
