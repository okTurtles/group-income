import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { renderMarkdown } from '@view-utils/markdown-utils.js'
import { validateURL, logExceptNavigationDuplicated } from '@view-utils/misc.js'
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
        const isCodeElement = entry.tagName === 'CODE'

        const routerOptions = { isInAppRouter: false, route: {}, href: '' }
        if (entry.tagName === 'A' && entry.attributes.href) {
          const { href } = entry.attributes
          const { url, isHttpValid } = validateURL(href, true)
          const appRouteBase = this.$router.options.base
          const appOrigin = document.location.origin + appRouteBase

          if (isHttpValid && url.href.startsWith(appOrigin)) {
            const path = url.pathname.split(appRouteBase)[1]
            const query = {}
            for (const [key, value] of url.searchParams) {
              query[key] = value
            }
            routerOptions.route = { path, query, hash: url.hash }
            routerOptions.href = this.$router.resolve(routerOptions.route).href
            routerOptions.isInAppRouter = true
          }
        }

        const opts = routerOptions.isInAppRouter
          ? {
              class: 'link',
              attrs: { href: routerOptions.href },
              on: {
                click: (e) => {
                  routerOptions.route && this.$router.push(routerOptions.route).catch(logExceptNavigationDuplicated)
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
          entry.tagName.toLowerCase(),
          opts,
          hasChildren
            ? entry.children.map(child => recursiveCall(child))
            : isCodeElement ? entry.text : undefined
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
      'div',
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
