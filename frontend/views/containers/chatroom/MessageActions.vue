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
      v-if='isCurrentUser'
      direction='top'
      :text='L("Edit")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Edit")'
        @click='action("edit")'
      )
        i.icon-pencil-alt

    tooltip(
      direction='top'
      :text='L("Reply")'
    )
      button.hide-touch.is-icon-small(
        :aria-label='L("Reply")'
        @click='action("reply")'
      )
        i.icon-reply

    tooltip(
      v-if='variant === "failed"'
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

  menu-content.c-content
    ul
      menu-item.hide-desktop.is-icon-small(tag='button'
        @click='action("openEmoticon", $event)'
      )
        i.icon-smile-beam
        i18n Add reaction

      menu-item.hide-desktop.is-icon-small(tag='button'
        v-if='isCurrentUser'
        @click='action("edit")'
      )
        i.icon-pencil-alt
        i18n Edit

      menu-item.hide-desktop.is-icon-small(tag='button'
        @click='action("reply")'
      )
        i.icon-reply
        i18n Reply

      menu-item.hide-desktop.is-icon-small(tag='button'
        v-if='variant === "failed"'
        @click='action("retry")'
      )
        i.icon-undo
        i18n Add emoticons

      menu-item.is-icon-small(tag='button'
        @click='action("copyToClipBoard")'
      )
        i.icon-link
        i18n Copy message Link

      menu-item.is-icon-small.is-danger(tag='button'
        @click='action("deleteMessage")'
      )
        i.icon-trash-alt
        i18n Delete message
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'MessageActions',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    Tooltip
  },
  props: {
    variant: String,
    isCurrentUser: Boolean
  },
  methods: {
    action (type, e) {
      // Change to sbp action
      this.$emit(type, e)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-actions {
  display: none;
  position: absolute;
  right: .5rem;
  top: -1rem;
  background-color: $background_0;
  padding: 0.125rem;
  box-shadow: 0px 0px 1.25rem $general_1_opacity_6;

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
  width: 13rem;

  .c-content {
    @extend %floating-panel;

    @include phone {
      padding: 0;
    }

    @include desktop {
      width: 100%;
      left: auto;
      right: 0.5rem;
      top: auto;
      bottom: calc(100% + 1.5rem);
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
