<template lang='pug'>
.c-emoticons-list(v-if='emoticonsList')
  .c-emoticon-wrapper(
    v-for='(list, emoticon, index) in emoticonsList'
    :key='index'
    :class='{"is-user-emoticon": list.includes(currentUserId)}'
    @click='$emit("selectEmoticon", emoticon)'
    v-if='list.length'
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
      @click='(e) => $emit("openEmoticon", e)'
    )
      i.icon-smile-beam.is-light
      i.icon-plus
</template>

<script>
import emoticonsMixins from './EmoticonsMixins.js'
import Tooltip from '@components/Tooltip.vue'
import { users } from '@containers/chatroom/fakeStore.js'
import L from '@view-utils/translations.js'

export default {
  name: 'MessageReactions',
  mixins: [emoticonsMixins],
  components: {
    Tooltip
  },
  props: {
    currentUserId: String,
    emoticonsList: {
      type: Object,
      default: null
    }
  },
  methods: {
    emoticonUserList (emoticon, list) {
      const nameList = list.map(user => {
        const userProp = users[user]
        if (user === this.currentUserId) return L('You')
        if (userProp) return userProp.displayName || userProp.name
        return null
      })

      const data = {
        userList: nameList.join(', '),
        emotiName: emoticon
      }
      return L('{userList} reacted with {emotiName}', data)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
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
    background-color: $primary_2;
  }

  .c-twrapper{
    display: flex;
    outline: none;
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
