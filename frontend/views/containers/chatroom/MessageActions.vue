<template lang='pug'>
menu-parent(ref='menu')
  .c-actions
    tooltip(
      direction='top'
      :text='L("Add reaction")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Add reaction")'
        @click='action("openEmoticon", $event)'
      )
        i.icon-smile-beam

    tooltip(
      v-if='isEditable'
      direction='top'
      :text='L("Edit")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Edit")'
        @click='action("editMessage")'
      )
        i.icon-pencil-alt

    tooltip(
      v-if='isText'
      direction='top'
      :text='L("Reply")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Reply")'
        @click='action("reply")'
      )
        i.icon-reply

    tooltip(
      v-if='variant==="failed"'
      direction='top'
      :text='L("Retry")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Retry")'
        @click='action("retry")'
      )
        i.icon-undo

    menu-trigger.is-icon-small(
      :aria-label='L("More options")'
    )
      i.icon-ellipsis-h

  menu-content.c-responsive-menu
    ul
      menu-item.hide-desktop.is-icon-small(
        tag='button'
        @click='action("openEmoticon", $event)'
      )
        i.icon-smile-beam
        i18n Add reaction

      menu-item.hide-desktop.is-icon-small(
        tag='button'
        v-if='isEditable'
        @click='action("editMessage")'
      )
        i.icon-pencil-alt
        i18n Edit

      menu-item.hide-desktop.is-icon-small(
        tag='button'
        v-if='isText'
        @click='action("reply")'
      )
        i.icon-reply
        i18n Reply

      menu-item.hide-desktop.is-icon-small(
        tag='button'
        v-if='variant==="failed"'
        @click='action("retry")'
      )
        i.icon-undo
        i18n Add emoticons

      menu-item.is-icon-small(
        v-if='isText'
        tag='button'
        @click='action("copyMessageText")'
      )
        i.icon-copy
        i18n Copy message text

      menu-item.is-icon-small(
        tag='button'
        @click='action("copyMessageLink")'
      )
        i.icon-link
        i18n Copy message link

      menu-item.is-icon-small.is-danger(
        tag='button'
        data-test='deleteMessage'
        v-if='isDeletable'
        @click='action("deleteMessage")'
      )
        i.icon-trash-alt
        i18n Delete message
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import Tooltip from '@components/Tooltip.vue'
import { MESSAGE_TYPES, MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'

export default ({
  name: 'MessageActions',
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
    isGroupCreator: Boolean
  },
  computed: {
    isText () {
      return this.type === MESSAGE_TYPES.TEXT
    },
    isPoll () {
      return this.type === MESSAGE_TYPES.POLL
    },
    isEditable () {
      return this.isMsgSender && this.isText
    },
    isDeletable () {
      return this.isEditable || this.isGroupCreator
    }
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

  .is-icon-small {
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

.c-menu {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: auto;

  .c-content {
    @include tablet {
      width: 100%;
      left: auto;
      right: 0.5rem;
      top: auto;
      bottom: calc(100% + 1.5rem);

      &.is-active {
        min-width: 13rem;
      }
    }
  }

  .c-menuItem ::v-deep .c-item-link {
    @extend %floating-panel-item;
  }
}

.icon-smile-beam::before {
  font-weight: 400;
}
</style>
