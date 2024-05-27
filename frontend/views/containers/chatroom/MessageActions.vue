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
        @click='action("editMessage", $event)'
      )
        i.icon-pencil-alt

    tooltip(
      v-if='isText'
      direction='top'
      :text='L("Reply")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Reply")'
        @click='action("reply", $event)'
      )
        i.icon-reply

    tooltip(
      v-if='variant==="failed"'
      direction='top'
      :text='L("Retry")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Retry")'
        @click='action("retry", $event)'
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
        @click='action("editMessage", $event)'
      )
        i.icon-pencil-alt
        i18n Edit

      menu-item.hide-desktop.is-icon-small(
        tag='button'
        v-if='isText'
        @click='action("reply", $event)'
      )
        i.icon-reply
        i18n Reply

      menu-item.hide-desktop.is-icon-small(
        tag='button'
        v-if='variant==="failed"'
        @click='action("retry", $event)'
      )
        i.icon-undo
        i18n Add emoticons

      menu-item.is-icon-small(
        tag='button'
        @click='action("copyMessageLink", $event)'
      )
        i.icon-link
        i18n Copy message Link

      menu-item.is-icon-small(
        v-if='!isAlreadyPinned && isPinnable'
        tag='button'
        data-test='pinMessage'
        @click='action("pinToChannel", $event)'
      )
        i.icon-thumbtack
        i18n Pin to channel

      menu-item.is-icon-small.is-danger(
        tag='button'
        data-test='deleteMessage'
        v-if='isDeletable'
        @click='action("deleteMessage", $event)'
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
    type: String,
    isMsgSender: Boolean,
    isGroupCreator: Boolean,
    isAlreadyPinned: Boolean
  },
  computed: {
    isText () {
      return this.type === MESSAGE_TYPES.TEXT
    },
    isPoll () {
      return this.type === MESSAGE_TYPES.POLL
    },
    isPinnable () {
      return this.isText || this.isPoll
    },
    isEditable () {
      return this.isMsgSender && (this.isText || this.isPoll)
    },
    isDeletable () {
      return this.isEditable || this.isGroupCreator
    }
  },
  methods: {
    action (type, e) {
      e.stopPropagation()
      // Change to sbp action
      this.$emit(type, e)
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
