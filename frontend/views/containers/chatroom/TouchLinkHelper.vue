<template lang='pug'>
.c-touch-link-helper(:class='{ "is-active": ephemeral.isActive }')
  .c-overlay-background(@click='close')

  .c-panel-content(tabindex='0' ref='contentEl')
    .c-panel-header
      i.icon-link.c-header-icon
      .c-link-content.has-text-1
        span.c-inner {{ ephemeral.linkUrl }}
      button.is-icon.has-background.c-close-btn(@click='close')
        i.icon-times

    ul.c-panel-menu
      li.c-panel-menu-item(
        v-for='entry in menuDisplay'
        tabindex='0'
        :key='entry.id'
        @click='onClickMenu(entry.id)'
      )
        i(:class='"icon-" + entry.icon')
        span.c-menu-text {{ entry.name }}

    input.c-invisible-input(
      v-if='ephemeral.isActive'
      type='text'
      ref='input'
      :value='ephemeral.linkUrl'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { OPEN_TOUCH_LINK_HELPER } from '@utils/events.js'
import { L } from '@common/common.js'

const menuList = [
  { id: 'open', name: L('Open in browser'), icon: 'external-link-alt', enableCheck: () => true },
  { id: 'copy', name: L('Copy link'), icon: 'paper-clip', enableCheck: () => true },
  { id: 'share', name: L('Share'), icon: 'share-alt', enableCheck: () => 'share' in window.navigator }
]

export default ({
  name: 'TouchLinkHelper',
  data () {
    return {
      ephemeral: {
        isActive: false,
        linkUrl: ''
      }
    }
  },
  computed: {
    menuDisplay () {
      return menuList.filter(entry => entry.enableCheck())
    }
  },
  methods: {
    close () {
      if (this.ephemeral.isActive) {
        this.ephemeral.isActive = false
        this.ephemeral.linkUrl = ''
      }
    },
    open (linkUrl = '') {
      if (linkUrl) {
        this.ephemeral.linkUrl = linkUrl
        this.ephemeral.isActive = true

        this.$refs.contentEl?.focus()
      }
    },
    onClickMenu (id) {
      const linkUrl = this.ephemeral.linkUrl

      switch (id) {
        case 'open': {
          window.open(linkUrl, '_blank').focus()
          break
        }
        case 'copy': {
          const postCopyAction = () => {
            this.close()
            sbp('gi.ui/showBanner', L('Copied to clipboard'), 'check-circle')
            setTimeout(() => { sbp('gi.ui/clearBanner') }, 1500)
          }

          if (window.navigator.clipboard) {
            window.navigator.clipboard.writeText(linkUrl).then(postCopyAction)
          } else {
            this.$refs.input.select()
            document.execCommand('copy')
            postCopyAction()
          }
          break
        }
        case 'share': {
          navigator.share({
            title: L('Share link'),
            url: linkUrl
          }).then(() => this.close())
        }
      }
    }
  },
  beforeMount () {
    sbp('okTurtles.events/on', OPEN_TOUCH_LINK_HELPER, this.open)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_TOUCH_LINK_HELPER, this.open)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-touch-link-helper {
  position: fixed;
  top: 0;
  z-index: $zindex-tooltip;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;

  &.is-active {
    pointer-events: initial;
    height: 100%;
  }
}

.c-overlay-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 0;
  opacity: 0;
  transition: opacity 300ms linear;

  .is-active & {
    opacity: 1;
  }
}

.c-panel-content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: max-content;
  border-radius: 1rem 1rem 0 0;
  background-color: $general_2;
  overflow: hidden;
  outline: none;
  z-index: 1;
}

.c-panel-header {
  position: relative;
  padding: 1rem 1.2rem;
  display: flex;
  align-items: center;
  background-color: $general_1;
  gap: 1rem;

  .c-header-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: $text_0;
    color: $general_2;
    flex-shrink: 0;
    font-size: $size_4;
  }

  .c-link-content {
    --lh: 16px;
    --max-lines: 2;
    position: relative;
    font-size: 13px;
    flex-grow: 1;
    word-break: break-all;
    line-height: var(--lh);
    max-height: calc(var(--lh) * var(--max-lines));
    user-select: none;
    display: -webkit-box;
    -webkit-line-clamp: var(--max-lines);
    -webkit-box-orient: vertical;
    overflow: hidden;

    .c-inner {
      display: block;
    }
  }

  .c-close-btn {
    width: 2rem;
    height: 2rem;
  }
}

.c-panel-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 1rem 1.2rem;
  gap: 0.75rem;
  color: $text_0;
  outline: none;
  background-color: rgba(0, 0, 0, 0);
  transition: background-color 200ms linear;

  &:focus {
    background-color: $general_1;
  }
}

.c-invisible-input {
  position: absolute;
  pointer-events: none;
  opacity: 0;
}
</style>
