<template lang='pug'>
.c-emoticons-list(v-if='emoticonsList')
  .c-emoticon-wrapper(
    v-for='(list, emoticon, index) in emoticonsList'
    :key='index'
    :class='{"is-user-emoticon": list.includes(currentUsername)}'
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
import { mapGetters } from 'vuex'
import Tooltip from '@components/Tooltip.vue'
import L from '@view-utils/translations.js'

export default ({
  name: 'MessageReactions',
  components: {
    Tooltip
  },
  props: {
    currentUsername: String,
    emoticonsList: {
      type: Object,
      default: null
    }
  },
  computed: {
    ...mapGetters(['globalProfile'])
  },
  methods: {
    emoticonUserList (emoticon, list) {
      const you = L('You')
      const nameList = list.map(username => {
        const userProp = this.globalProfile(username)
        if (username === this.currentUsername) return you
        if (userProp) return userProp.displayName || userProp.username
        return null
      })
      const alreadyMade = nameList.indexOf(you)
      if (alreadyMade >= 0) {
        nameList.splice(alreadyMade, 1)
        nameList.push(you)
      }
      let userList = nameList.join(', ')
      const andIndex = userList.lastIndexOf(', ')
      if (andIndex > 0) {
        userList = userList.slice(0, andIndex) + ' and' + userList.slice(andIndex + 1)
      }

      const data = { userList, emotiName: emoticon }
      return L('{userList} reacted with {emotiName}', data)
    }
  }
}: Object)
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
  padding: 0 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  cursor: pointer;

  &.is-user-emoticon {
    color: $primary_0;
    border-color: $primary_0;
    background-color: $primary_2;
  }

  .c-twrapper {
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
      font-size: 0.6rem;
      margin-left: 0.3rem;
    }
  }
}
</style>
