<template lang='pug'>
menu-parent
  .c-actions
    button.is-icon-small(
      :aria-label='L("Add reaction")'
      @click='action("addReaction")'
    )
      i.icon-smile-beam
    button.is-icon-small(
      v-if='isCurrentUser'
      :aria-label='L("Edit")'
      @click='action("edit")'
    )
      i.icon-pencil-alt
    button.is-icon-small(
      :aria-label='L("Reply")'
      @click='action("reply")'
    )
      i.icon-reply
    button.is-icon-small(
      v-if='variant === "failed"'
      :aria-label='L("Add emoticons")'
      @click='action("retry")'
    )
      i.icon-undo

    menu-trigger.is-icon-small(
      :aria-label='L("More options")'
      @click='action("moreOptions")'
    )
      i.icon-ellipsis-h

  menu-content.c-content
    ul
      menu-item.is-icon-small(
        tag='button'
        @click='action("copyToClipBoard")'
      )
        i.icon-link
        | {{L('Copy message Link')}}
      menu-item.is-icon-small.is-danger(
        tag='button'
        @click='action("deleteMessage")'
      )
        i.icon-trash-alt
        | {{L('Delete message')}}
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'

export default {
  name: 'MessageActions',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  props: {
    variant: String,
    isCurrentUser: Boolean
  },
  methods: {
    action (type) {
      console.log('TODO')
      this.$emit(type)
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

  .is-icon-small {
    color: $text_1;
    border-radius: 0;

    &:hover {
      background-color: $general_2;
      color: $text_0;
    }
  }

  ::v-deep .is-danger {
    background-color: $danger_2;
    .c-item-slot i,
    .c-item-slot {
      color: $danger_0;
    }
  }
}

.c-menu {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 13rem;

  .c-content {
    width: 100%;
    left: auto;
    right: 0.5rem;
    top: auto;
    bottom: calc(100% + 1.5rem);
  }
}
</style>
