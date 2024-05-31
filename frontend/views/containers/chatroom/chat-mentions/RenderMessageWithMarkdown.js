import { L } from '@common/common.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'
import { htmlStringToDomObjectTree } from './chat-mentions-utils.js'
import RenderMessageText from './RenderMessageText.vue'

// reference (Vue render function): https://v2.vuejs.org/v2/guide/render-function
const RenderMessageWithMarkdown: any = {
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
  render: function (createElement: any): any {
    const { text, edited = false, isReplyingMessage = false } = this.$props
    const domTree = htmlStringToDomObjectTree(renderMarkdown(text))

    // Turns a dom tree object structure into the equivalent recursive createElement(...) call structure.
    const recursiveCall = (entry: any): any => {
      if (entry.tagName === 'ROUTER') {
        const hasChildren = Array.isArray(entry.children)
        return createElement(
          'span',
          {
            class: 'link',
            on: {
              click: () => {
                if (entry.attributes?.route) {
                  this.$router.push(JSON.parse(entry.attributes.route))
                }
              }
            }
          },
          hasChildren
            ? entry.children.map(child => recursiveCall(child))
            : undefined
        )
      } else if (entry.tagName) {
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
          'c-replying': isReplyingMessage,
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
            class: { 'c-edited': true }
          },
          L('(edited)')
        )
      ].filter(Boolean)
    )
  }
}

export default RenderMessageWithMarkdown
