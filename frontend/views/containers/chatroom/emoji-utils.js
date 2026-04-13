import { EmojiIndex } from 'emoji-mart-vue-fast'
import data from 'emoji-mart-vue-fast/data/apple.json'

export const emojiIndex: any = new EmojiIndex(data)

export const searchEmoji = (query: string = ''): any => {
  return emojiIndex.search(query)
}
