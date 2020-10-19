<template lang='pug'>
.c-message(:class='[variant, isSameSender && "sameSender"]')
  .c-message-wrapper
    avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')
    .c-body
      .c-who(:class='{ "sr-only": isSameSender }')
        span.is-title-4 {{who}}
        span.has-text-1 {{getTime(time)}}

      // TODO: #502 - Chat: Add support to markdown formatted text
      p.c-text(v-if='text') {{text}}

  .c-emoticons-list(v-if='emoticonsList')
    .c-emoticon-wrapper(
      v-for='(list, emoticon, index) in emoticonsList'
      :key='index'
      :class='{"is-user-emoticon": list.includes(currentUserId)}'
      @click='$emit("addEmoticon", emoticon)'
    )
      tooltip.c-tip(
        direction='top'
        :text='emoticonUserList(emoticon, list)'
      )
        | {{emoticon}}
        .c-emoticon-number {{list.length}}

    .c-emoticon-wrapper.c-add-icon
      button.is-icon-small(
        :aria-label='L("Add reaction")'
        @click='openEmoticon'
      )
        i.icon-smile-beam.is-light
        i.icon-plus
  menu-parent
    .c-actions
      button.is-icon-small(
        :aria-label='L("Add reaction")'
        @click='openEmoticon'
      )
        i.icon-smile-beam
      button.is-icon-small(
        v-if='isCurrentUser'
        :aria-label='L("Edit")'
        @click='edit'
      )
        i.icon-pencil-alt
      button.is-icon-small(
        :aria-label='L("Reply")'
        @click='reply'
      )
        i.icon-reply
      button.is-icon-small(
        v-if='variant === "failed"'
        :aria-label='L("Add emoticons")'
        @click='$emit("retry")'
      )
        i.icon-undo

      menu-trigger.is-icon-small(
        :aria-label='L("More options")'
        @click='moreOptions'
      )
        i.icon-ellipsis-h

    menu-content.c-content
      ul
        menu-item.is-icon-small(
          tag='button'
          @click='copyToClipBoard'
        )
          i.icon-link
          | {{L('Copy message Link')}}
        menu-item.is-icon-small.is-danger(
          tag='button'
          @click='$emit("deleteMessage")'
        )
          i.icon-trash-alt
          | {{L('Delete message')}}
</template>

<script>
import Avatar from '@components/Avatar.vue'
import { getTime } from '@utils/time.js'
import emoticonsMixins from './EmoticonsMixins.js'
import Tooltip from '@components/Tooltip.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import { users } from '@containers/chatroom/fakeStore.js'
import L from '@view-utils/translations.js'

const variants = {
  SENT: 'sent',
  RECEIVED: 'received',
  FAILED: 'failed'
}

export default {
  name: 'Message',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    Tooltip
  },
  props: {
    text: String,
    who: String,
    currentUserId: String,
    avatar: String,
    time: {
      type: Date,
      required: true
    },
    variant: {
      type: String,
      validator (value) {
        return [variants.SENT, variants.RECEIVED, variants.FAILED].indexOf(value) !== -1
      }
    },
    emoticonsList: {
      type: Object,
      default: null
    },
    isSameSender: Boolean,
    isCurrentUser: Boolean
  },
  constants: Object.freeze({
    variants
  }),
  methods: {
    getTime,
    emoticonUserList (emoticon, list) {
      const nameList = list.map(user => {
        const userProp = users[user]
        if (userProp) return userProp.displayName || userProp.name
      })
      const data = {
        userList: nameList.join(', '),
        emotiName: emoticon
      }

      console.log(data)

      return L('{userList} reacted with {emotiName}', data)
    },
    edit () {
      console.log('TODO')
    },
    reply () {
      console.log('TODO')
    },
    moreOptions () {
      console.log('TODO')
    },
    copyToClipBoard () {
      navigator.clipboard.writeText(this.text)
    },
    selectEmoticon (emoticon) {
      this.$emit('addEmoticon', emoticon.native)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  padding: 0.5rem 2.5rem;
  position: relative;
  max-height: 100%;

  &.removed {
    background-color: $danger_2;
    opacity: 0;
    transition: opacity 0.7s ease-in-out 0.3s, background-color 0.3s ease-in;
  }

  &.sameSender {
    margin-top: 0.25rem;
  }

  .button {
    flex-shrink: 0;
  }

  .c-avatar {
    margin-right: 0.5rem;
  }

  &:hover {
    background-color: $general_2;
    .c-actions {
      display: flex;
    }
  }
}

.c-message-wrapper {
  display: flex;
  align-items: flex-start;
}

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

.c-avatar {
  .isHidden &,
  .sameSender & {
    visibility: hidden;
    height: 0;
  }
}

.c-body {
  max-width: 100%;
}

.c-who {
  display: block;

  span {
    padding-right: 0.25rem;
  }
}

.c-text {
  max-width: 32rem;
  word-wrap: break-word; // too much long words will break
  white-space: pre-line; // break \n to a new line
  margin: 0;

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: 0.5rem;
  }
}

.c-emoticons-list {
  padding-left: 2.5rem;
  display: flex;
}

.c-emoticon-wrapper {
  color: $text_1;
  background-color: $general_2;
  border: 1px solid $general_1;
  border-radius: 3px;
  padding: 0 .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  cursor: pointer;

  &.is-user-emoticon {
    color: $primary_0;
    border-color: $primary_0;
  }

  .c-twrapper{
    display: flex;
  }

  .icon-smile-beam.is-light::before {
    font-weight: 400;
  }

  &:hover {
    background-color: $general_1;
  }
}

.c-add-icon {
  background-color: transparent;
  button {
    height: auto;
    &:focus {
      box-shadow: none;
      background: transparent;
    }
  }
  i {
    color: $general_0;

    &.icon-plus {
      font-size: .6rem;
      margin-left: 0.3rem;
    }
  }
}
</style>
