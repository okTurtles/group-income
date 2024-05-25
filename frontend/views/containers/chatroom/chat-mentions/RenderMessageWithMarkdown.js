import { Vue, L } from '@common/common.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'
import { htmlStringToDomObjectTree } from './chat-mentions-utils.js'
import RenderMessageText from './RenderMessageText.vue'

Vue.component('RenderMessageWithMarkdown', {
  name: 'RenderMessageWithMarkdown',
  props: {
    text: {
      type: String,
      required: true,
      default: ''
    },
    edited: Boolean,
    isReplyingMessage: Boolean
  },
  render: function (createElement) {
    const { text, edited = false, isReplyingMessage = false } = this.$props
    const domTree = htmlStringToDomObjectTree(renderMarkdown(text))

    console.log('!@# text: ', text)
    console.log('!@# markdown converted: ', renderMarkdown(text))
    console.log('!@# final domTree: ', domTree)
    const recursiveCall = (entry: any) => {
      if (entry.tagName) {
        const hasChildren = Array.isArray(entry.children)

        return createElement(
          entry.tagName.toLowerCase(),
          {
            attrs: entry.attributes || {}
          },
          hasChildren
            ? entry.children.map(child => recursiveCall(child))
            : undefined
        )
      } else if (entry.text) {
        return createElement(
          RenderMessageText,
          {
            attrs: entry.attributes || {},
            props: {
              text: entry.text,
              tag: 'span'
            }
          }
        )
      }
    }

    return createElement(
      'p',
      {
        class: {
          'is-replying': isReplyingMessage,
          'custom-markdown-content': true
        },
        attrs: { ...(this.$attrs || {}) },
        on: { ...(this.$listeners || {}) }
      },
      [
        ...domTree.map(entry => recursiveCall(entry)),
        edited && createElement(
          'span',
          {
            class: { 'edited': true }
          },
          L('(edited)')
        )
      ].filter(Boolean)
    )
  }
})
