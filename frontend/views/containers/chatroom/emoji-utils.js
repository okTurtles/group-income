import { EmojiIndex } from 'emoji-mart-vue-fast'
import data from 'emoji-mart-vue-fast/data/apple.json'

export const emojiIndex: any = new EmojiIndex(data)

export const searchEmoji = (query: string = '', sortByRelevance: boolean = false): any => {
  const results = emojiIndex.search(query)

  if (results?.length > 0 && sortByRelevance) {
    return results.sort((a, b) => {
      const getColonsMatchIndex = (colons) => {
        const matchIndex = colons.indexOf(query)
        // If there is no matching string piece in the colons of the item, set the index to a large number so that it has low priority.
        return matchIndex === -1 ? 10000 : matchIndex
      }
      const aColonsMatchIndex = getColonsMatchIndex(a.colons)
      const bColonsMatchIndex = getColonsMatchIndex(b.colons)

      return aColonsMatchIndex - bColonsMatchIndex
    })
  }

  return results
}
