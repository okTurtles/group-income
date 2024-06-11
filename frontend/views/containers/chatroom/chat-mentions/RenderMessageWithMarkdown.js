import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'
import { OPEN_TOUCH_LINK_HELPER } from '@utils/events.js'
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
      if (entry.tagName) {
        const hasChildren = Array.isArray(entry.children)
        // NOTE: this ROUTER entry is temporary one which is created
        //       by makeInAppLinkElement function from markdown-utils.js
        const isRouter = entry.tagName === 'ROUTER'

        const routerOptions = {}
        if (isRouter) {
          routerOptions.route = entry.attributes.route && JSON.parse(entry.attributes.route)
          routerOptions.href = routerOptions.route && this.$router.resolve(routerOptions.route).href
        }

        const elName =  isRouter ? 'a' : entry.tagName.toLowerCase()
        const opts = isRouter
          ? {
              class: 'link',
              attrs: { href: routerOptions.href },
              on: {
                click: (e) => {
                  routerOptions.route && this.$router.push(routerOptions.route)
                  e?.preventDefault()
                },
                touchhold: (e) => {
                  routerOptions.href && sbp('okTurtles.events/emit', OPEN_TOUCH_LINK_HELPER, routerOptions.href)
                  e?.preventDefault()
                }
              }
            }
          : { attrs: entry.attributes || {} }

        return createElement(
          elName,
          opts,
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
