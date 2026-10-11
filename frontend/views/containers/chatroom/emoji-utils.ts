import { EmojiIndex } from 'emoji-mart-vue-fast'
import data from 'emoji-mart-vue-fast/data/apple.json'

export const emojiIndex: any = new EmojiIndex(data)

export const searchEmoji = (query: string = '', sortByRelevance: boolean = false, maxResults: number = 30): any => {
  // sortByRelevance: places the items that have the query string piece in their colons at the top of the list.
  let results = emojiIndex.search(query)

  if (results?.length > 0) {
    if (sortByRelevance) {
      const lowerCaseQuery = query.toLowerCase()
      const getColonsMatchIndex = (colons) => {
        const matchIndex = colons.toLowerCase().indexOf(lowerCaseQuery)
        // If there is no matching string piece in the colons of the item, set the index to a large number so that it has low priority.
        return matchIndex === -1 ? 10000 : matchIndex
      }

      results = results
        .map(emoji => ({ emoji, matchIndex: getColonsMatchIndex(emoji.colons) }))
        .sort((a, b) => a.matchIndex - b.matchIndex)
        .map(({ emoji }) => emoji)
    }

    results = results.slice(0, maxResults)
  }

  return results
}
