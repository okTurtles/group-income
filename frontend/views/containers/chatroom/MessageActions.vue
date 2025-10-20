<template lang='pug'>
.c-message-menu
  .c-actions
    tooltip(
      direction='top'
      :text='L("Add reaction")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Add reaction")'
        @click.stop='action("openEmoticon", $event)'
      )
        i.icon-smile-beam

    tooltip(
      v-if='isEditable'
      direction='top'
      :text='L("Edit")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Edit")'
        @click.stop='action("editMessage")'
      )
        i.icon-pencil-alt

    tooltip(
      v-if='isReplyable'
      direction='top'
      :text='L("Reply")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Reply")'
        @click.stop='action("reply")'
      )
        i.icon-reply

    tooltip(
      v-if='variant==="failed"'
      direction='top'
      :text='L("Retry")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Retry")'
        @click.stop='action("retry")'
      )
        i.icon-undo

    menu-parent(ref='menu' @menu-open='moreOptionsTriggered' @menu-close='moreOptionsClosed')
      menu-trigger.is-icon-small(
        :aria-label='L("More options")'
      )
        i.icon-ellipsis-h
      dialog.c-dialog(ref='dialog' @click='clickAway' @close='closeDialog')
        menu-content(:class='{ "is-to-down": isToDown }')
          menu
            template(v-for='(option, index) in moreOptions')
              menu-item.is-icon-small(
                :key='index'
                tag='button'
                :data-test='option.action'
                @click.stop='action(option.action, $event)'
              )
                i(:class='`icon-${option.icon}`')
                span {{ option.name }}
</template>

<script>
import Tooltip from '@components/Tooltip.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import { MESSAGE_TYPES, MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'
import { L } from '@common/common.js'

export default ({
  name: 'MessageActions',
  inject: ['chatMainConfig'],
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    Tooltip
  },
  props: {
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    messageHash: String,
    text: String,
    type: String,
    isMsgSender: Boolean,
    isGroupCreator: Boolean,
    isAlreadyPinned: Boolean
  },
  data () {
    return {
      isDesktopScreen: true,
      isToDown: false
    }
  },
  computed: {
    isText () {
      return this.type === MESSAGE_TYPES.TEXT
    },
    isPoll () {
      return this.type === MESSAGE_TYPES.POLL
    },
    isReplyable () {
      return [MESSAGE_TYPES.TEXT, MESSAGE_TYPES.INTERACTIVE].includes(this.type)
    },
    isPinnable () {
      return this.isText || this.isPoll
    },
    isEditable () {
      return this.isMsgSender && this.isText
    },
    isDeletable () {
      return this.isGroupCreator ||
        (this.isMsgSender && (this.isText || this.isPoll))
    },
    moreOptions () {
      const possibleMoreOptions = [{
        name: L('Add reaction'),
        action: 'openEmoticon',
        icon: 'smile-beam',
        conditionToShow: !this.isDesktopScreen
      }, {
        name: L('Mark unread'),
        action: 'markAsUnread',
        icon: 'envelope',
        conditionToShow: true
      }, {
        name: L('Edit'),
        action: 'editMessage',
        icon: 'pencil-alt',
        conditionToShow: !this.isDesktopScreen && this.isEditable
      }, {
        name: L('Reply'),
        action: 'reply',
        icon: 'reply',
        conditionToShow: !this.isDesktopScreen && this.isReplyable
      }, {
        name: L('Retry'),
        action: 'retry',
        icon: 'undo',
        conditionToShow: !this.isDesktopScreen && this.variant === 'failed'
      }, {
        name: L('Copy message text'),
        action: 'copyMessageText',
        icon: 'copy',
        conditionToShow: this.isText
      }, {
        name: L('Copy message link'),
        action: 'copyMessageLink',
        icon: 'link',
        conditionToShow: true
      }, {
        name: L('Pin to channel'),
        action: 'pinToChannel',
        icon: 'thumbtack',
        conditionToShow: !this.isAlreadyPinned && this.isPinnable
      }, {
        name: L('Unpin from channel'),
        action: 'unpinFromChannel',
        icon: 'thumbtack',
        conditionToShow: this.isAlreadyPinned
      }, {
        name: L('Delete message'),
        action: 'deleteMessage',
        icon: 'trash-alt',
        conditionToShow: this.isDeletable
      }]

      return possibleMoreOptions.filter(option => option.conditionToShow)
    }
  },
  created () {
    this.matchMediaDesktop = window.matchMedia('screen and (min-width: 1200px)')

    this.matchMediaDesktop.onchange = (e) => {
      this.isDesktopScreen = e.matches
    }
    this.isDesktopScreen = this.matchMediaDesktop.matches
  },
  beforeDestroy () {
    this.matchMediaDesktop.onchange = null
  },
  methods: {
    action (type, e) {
      const copyString = str => {
        navigator?.clipboard.writeText(str)
      }
      switch (type) {
        case 'copyMessageLink': {
          if (!this.messageHash) { return }

          const url = new URL(location.href)
          url.search = `mhash=${this.messageHash}`

          copyString(url.href)
          break
        }
        case 'copyMessageText': {
          if (!this.text) { return }

          copyString(this.text)
          break
        }
        default: {
          // Change to sbp action
          this.$emit(type, e)
        }
      }
    },
    moreOptionsClosed () {
      this.$refs.dialog?.close?.()
    },
    moreOptionsTriggered () {
      this.$refs.dialog.showModal()

      const repositionDialog = () => requestAnimationFrame(() => {
        const dialogEl = this.$refs.dialog
        if (!dialogEl) return
        const eleTrigger = this.$el.querySelector('.c-menu summary')
        const eleTriggerCBR = eleTrigger.getBoundingClientRect()

        const isMobile = !!this.chatMainConfig.isPhone

        if (isMobile) {
          Object.assign(dialogEl.style, {
            top: 'auto',
            right: '0',
            bottom: '0',
            left: '0'
          })

          return
        }

        const heightOfMenuItem = !isMobile ? 36 : 54
        const calculatedMoreOptionsMenuHeight = this.moreOptions.length * heightOfMenuItem + 2 * 8 // 8px = padding of 0.5rem for bottom and top
        const calculatedHeightOfNeededSpace = calculatedMoreOptionsMenuHeight + 32 // 32px = offset

        const isToDown = calculatedHeightOfNeededSpace > eleTriggerCBR.top

        Object.assign(dialogEl.style, {
          top: isToDown ? `${eleTriggerCBR.bottom}px` : 'auto',
          right: `calc(100vw - ${eleTriggerCBR.right}px)`,
          bottom: isToDown ? 'auto' : `calc(100vh - ${eleTriggerCBR.top}px)`,
          left: 'auto'
        })
      })

      repositionDialog()
      window.addEventListener('resize', repositionDialog, false)
      const closeHandler = () => {
        window.removeEventListener('resize', repositionDialog, false)
        this.$refs.dialog.removeEventListener('close', closeHandler, false)
      }
      this.$refs.dialog.addEventListener('close', closeHandler, false)
    },
    closeDialog (e) {
      this.$refs.menu?.closeMenu()
    },
    clickAway (e) {
      if (!(e.target instanceof HTMLDialogElement)) return
      const BCR = e.target.getBoundingClientRect()
      if (BCR.top < e.clientY || BCR.bottom > e.clientY || BCR.left < e.clientX || BCR.right > e.clientX) {
        e.target.close()
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-actions {
  display: none;
  position: absolute;
  right: 0.5rem;
  top: -1rem;
  background-color: $background_0;
  padding: 0.125rem;
  box-shadow: 0 0 1.25rem $general_1_opacity_6;

  @include phone {
    right: 1.5rem;
  }

  & > * > .is-icon-small {
    color: $text_1;
    border-radius: 0;
    width: 2.375rem;
    height: 2rem;

    &:hover {
      background-color: $general_2;
      color: $text_0;
    }
  }
}

::v-deep .is-danger:hover {
  background-color: $danger_2;

  .c-item-slot i,
  .c-item-slot {
    color: $danger_0;
  }
}

.c-message-menu {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: auto;
}

.c-menu {
  .c-dialog {
    border: 0;
    padding: 0;
    margin: 0;
    overflow: visible;
    background: transparent;
    min-width: 100%;

    @include tablet {
      min-width: auto;
      padding: 0.5rem 0;
    }

    & .c-content {
      position: static;
      overflow: auto;
    }

    &::backdrop {
      background-color: rgba(0, 0, 0, 0.7);

      @include tablet {
        background-color: transparent;
      }
    }
  }

  .c-content {
    @include tablet {
      width: 100%;
      left: auto;
      right: 0;
      top: auto;
      bottom: calc(100% + 0.5rem);

      &.is-to-down {
        top: 2.75rem;
        bottom: auto;
      }

      &.is-active {
        min-width: 13rem;
      }
    }
  }

  .c-menuItem ::v-deep .c-item-link {
    height: 3.43rem;
    width: 100%;
    font-family: "Lato";
    box-sizing: border-box;

    i {
      margin-right: 1rem;
    }

    @include tablet {
      height: 2.31rem;

      i {
        margin-right: 0.5rem;
      }
    }
  }
}

@include tablet {
  .icon-smile-beam::before {
    font-weight: 400;
  }
}
</style>
