import { EmojiIndex } from 'emoji-mart-vue-fast'
import data from 'emoji-mart-vue-fast/data/apple.json'

export const emojiIndex: any = new EmojiIndex(data)

export const searchEmoji = (query: string = '', sortByRelevance: boolean = false, maxResults: number = 30): any => {
  // sortByRelevance: places the items that have the query string piece in their colons at the top of the list.
  let results = emojiIndex.search(query)

  if (results?.length > 0) {
    if (sortByRelevance) {
      results = results.slice().sort((a, b) => {
        const getColonsMatchIndex = (colons) => {
          const matchIndex = colons.toLowerCase().indexOf(query.toLowerCase())
          // If there is no matching string piece in the colons of the item, set the index to a large number so that it has low priority.
          return matchIndex === -1 ? 10000 : matchIndex
        }
        const aColonsMatchIndex = getColonsMatchIndex(a.colons)
        const bColonsMatchIndex = getColonsMatchIndex(b.colons)

        return aColonsMatchIndex - bColonsMatchIndex
      })
    }

    results = results.slice(0, maxResults)
  }

  return results
}
