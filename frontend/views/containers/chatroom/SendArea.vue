<template lang='pug'>
.c-send.inputgroup(
  :class='{"is-editing": isEditing}'
  data-test='messageInputWrapper'
)
  .c-mentions(
    v-if='ephemeral.mention.options.length'
    ref='mentionWrapper'
  )
    template(v-for='(user, index) in ephemeral.mention.options')
      .c-mention-user(
        ref='mention'
        :class='{"is-selected": index === ephemeral.mention.index}'
        @click='addSelectedMention(index)'
      )
        avatar(:src='user.picture' size='xs')
        .c-username {{user.username}}

  .c-jump-to-latest(
    v-if='scrolledUp && !replyingMessage'
    @click='$emit("jump-to-latest")'
  )
    i18n Jump to latest message
    button.is-icon-small
      i.icon-arrow-down
  .c-replying-wrapper
    .c-replying(v-if='replyingMessage')
      i18n(:args='{ replyingTo, replyingMessage }') Replying to {replyingTo}: "{replyingMessage}"
      button.c-clear.is-icon-small(
        :aria-label='L("Stop replying")'
        @click='stopReplying'
      )
        i.icon-times

  textarea.textarea.c-send-textarea(
    ref='textarea'
    :disabled='loading'
    :placeholder='L("Write your message...")'
    :style='textareaStyles'
    @focus='textAreaFocus'
    @blur='textAreaBlur'
    @keydown.enter.exact.prevent='handleKeyDownEnter'
    @keydown.tab.exact='handleKeyDownTab'
    @keydown.ctrl='isNextLine'
    @keydown='handleKeydown'
    @keyup='handleKeyup'
    v-bind='$attrs'
  )

  .c-send-actions(ref='actions')
    .c-edit-actions(v-if='isEditing')
      i18n.is-small.is-outlined(
        tag='button'
        @click='$emit("cancelEdit")'
      ) Cancel

      i18n.button.is-small(
        tag='button'
        @click='sendMessage'
      ) Save changes

    div(v-if='isEditing')
      .addons.addons-editing
        tooltip(
          v-if='ephemeral.showButtons'
          direction='top'
          :text='L("Add reaction")'
        )
          button.is-icon(
            :aria-label='L("Add reaction")'
            @click='openEmoticon'
          )
            i.icon-smile-beam
    div(v-else)
      .addons
        tooltip(
          v-if='ephemeral.showButtons'
          direction='top'
          :text='L("Create poll")'
        )
          button.is-icon(
            :aria-label='L("Create poll")'
            @click='createPool'
          )
            i.icon-poll
        tooltip(
          v-if='ephemeral.showButtons'
          direction='top'
          :text='L("Add reaction")'
        )
          button.is-icon(
            :aria-label='L("Add reaction")'
            @click='openEmoticon'
          )
            i.icon-smile-beam

      i18n.c-send-button(
        id='mobileSendButton'
        v-if='showSendButton'
        tag='button'
        :class='{ isActive, showSendButton }'
        @click='sendMessage'
      ) Send

  .textarea.c-send-mask(
    ref='mask'
    :style='maskStyles'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import emoticonsMixins from './EmoticonsMixins.js'
import Avatar from '@components/Avatar.vue'
import Tooltip from '@components/Tooltip.vue'
import { makeMentionFromUsername } from '@model/contracts/chatroom.js'

const caretKeyCodes = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Esc: 27,
  End: 35,
  Home: 36
}
const caretKeyCodeValues = Object.fromEntries(Object.values(caretKeyCodes).map(v => [v, true]))
const functionalKeyCodes = {
  Shift: 16,
  Ctrl: 17,
  Alt: 18,
  CapsLock: 20,
  Enter: 13
}
const functionalKeyCodeValues = Object.fromEntries(Object.values(functionalKeyCodes).map(v => [v, true]))

export default ({
  name: 'SendArea',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    Tooltip
  },
  props: {
    title: String,
    defaultText: String,
    searchPlaceholder: String,
    scrolledUp: Boolean,
    loading: {
      type: Boolean,
      default: false
    },
    replyingMessage: String,
    replyingMessageId: String,
    replyingTo: String,
    isEditing: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      ephemeral: {
        actionsWidth: '',
        maskHeight: '',
        textWithLines: '',
        showButtons: true,
        isPhone: false,
        mention: {
          position: -1,
          options: [],
          index: -1
        }
      }
    }
  },
  watch: {
    replyingMessage () {
      this.$refs.textarea.focus()
    }
  },
  created () {
    // TODO #492 create a global Vue Responsive just for media queries.
    const mediaIsPhone = window.matchMedia('screen and (max-width: 639px)')
    this.ephemeral.isPhone = mediaIsPhone.matches
    mediaIsPhone.onchange = (e) => { this.ephemeral.isPhone = e.matches }
  },
  mounted () {
    this.$refs.textarea.value = this.defaultText || ''
    // Get actionsWidth to add a dynamic padding to textarea,
    // so those actions don't be above the textarea's value
    this.ephemeral.actionsWidth = this.isEditing ? 0 : this.$refs.actions.offsetWidth
    this.updateTextArea()
    if (!this.ephemeral.isPhone) this.$refs.textarea.focus()
  },
  computed: {
    ...mapGetters(['chatRoomUsers', 'globalProfile']),
    users () {
      return Object.keys(this.chatRoomUsers)
        .map(username => {
          const { displayName, picture } = this.globalProfile(username)
          return {
            username,
            displayName: displayName || username,
            picture
          }
        })
    },
    textareaStyles () {
      return {
        paddingRight: this.ephemeral.actionsWidth + 'px',
        height: this.ephemeral.maskHeight + 'px'
      }
    },
    maskStyles () {
      return {
        paddingRight: this.ephemeral.actionsWidth + 'px'
      }
    },
    isActive () {
      return this.ephemeral.textWithLines
    },
    showSendButton () {
      return this.ephemeral.isPhone && !this.ephemeral.showButtons
    }
  },
  methods: {
    textAreaFocus () {
      if (this.ephemeral.isPhone) this.ephemeral.showButtons = false
    },
    textAreaBlur (event) {
      if (!this.ephemeral.isPhone) {
        return
      }

      if (event?.relatedTarget?.id === 'mobileSendButton') {
        this.sendMessage()
      } else {
        this.ephemeral.showButtons = true
      }
    },
    isNextLine (e) {
      const enterKey = e.keyCode === 13
      if ((e.shiftKey || e.altKey || e.ctrlKey) && enterKey) {
        return this.createNewLine()
      }
    },
    updateMentionKeyword () {
      let value = this.$refs.textarea.value.slice(0, this.$refs.textarea.selectionStart)
      const lastIndex = value.lastIndexOf('@')
      const regExWordStart = /(\s)/g // RegEx Metacharacter \s
      if (lastIndex === -1 || (lastIndex > 0 && !regExWordStart.test(value[lastIndex - 1]))) {
        return this.endMention()
      }
      value = value.slice(lastIndex + 1)
      if (regExWordStart.test(value)) {
        return this.endMention()
      }
      this.startMention(value, lastIndex)
    },
    handleKeydown (e) {
      if (caretKeyCodeValues[e.keyCode]) {
        const nChoices = this.ephemeral.mention.options.length
        if (nChoices &&
          (e.keyCode === caretKeyCodes.ArrowUp || e.keyCode === caretKeyCodes.ArrowDown)) {
          const offset = e.keyCode === caretKeyCodes.ArrowUp ? -1 : 1
          const newIndex = (this.ephemeral.mention.index + offset + nChoices) % nChoices
          this.ephemeral.mention.index = newIndex

          const { clientHeight, scrollHeight } = this.$refs.mentionWrapper
          if (scrollHeight !== clientHeight) {
            const offsetTop = this.$refs.mention[newIndex].offsetTop + this.$refs.mention[newIndex].clientHeight

            this.$refs.mentionWrapper.scrollTo({
              left: 0, top: Math.max(0, offsetTop - clientHeight)
            })
          }

          e.preventDefault()
        } else {
          this.endMention()
        }
      }
    },
    handleKeyDownEnter () {
      if (this.ephemeral.mention.options.length) {
        this.addSelectedMention(this.ephemeral.mention.index)
      } else {
        this.sendMessage()
      }
    },
    handleKeyDownTab (e) {
      if (this.ephemeral.mention.options.length) {
        this.addSelectedMention(this.ephemeral.mention.index)
        e.preventDefault()
      }
    },
    handleKeyup (e) {
      if (e.keyCode === 13) e.preventDefault()
      else this.updateTextArea()

      if (!caretKeyCodeValues[e.keyCode] && !functionalKeyCodeValues[e.keyCode]) {
        this.updateMentionKeyword()
      }
    },
    addSelectedMention (index) {
      const curValue = this.$refs.textarea.value
      const curPosition = this.$refs.textarea.selectionStart

      const mention = makeMentionFromUsername(this.ephemeral.mention.options[index].username).me
      const value = curValue.slice(0, this.ephemeral.mention.position) +
         mention + ' ' + curValue.slice(curPosition)
      this.$refs.textarea.value = value
      const selectionStart = this.ephemeral.mention.position + mention.length + 1
      this.$refs.textarea.setSelectionRange(selectionStart, selectionStart)
      this.endMention()
    },
    updateTextWithLines () {
      const newValue = this.$refs.textarea.value
      if (this.ephemeral.textWithLines === newValue) {
        return false
      }

      this.ephemeral.textWithLines = newValue
      return true
    },
    updateTextArea () {
      if (!this.updateTextWithLines()) {
        // dont calculate again when the value is the same (ex: happens on shift+enter)
        return false
      }

      const isLastLineEmpty = this.ephemeral.textWithLines.endsWith('\n')

      // TRICK: Use an invisible element (.mask) as placeholder to know the
      // amount of space the user message takes... (taking in account new lines)
      this.$refs.mask.textContent = this.ephemeral.textWithLines + (isLastLineEmpty ? '.' : '')

      // ...and apply the maks's height to the textarea so it dynamically grows as the user types
      this.ephemeral.maskHeight = this.$refs.mask.offsetHeight - 2

      // ... finaly inform the parent about the new height to adjust the layout
      this.$emit('height-update', this.ephemeral.maskHeight + 'px')
    },
    createNewLine () {
      this.$refs.textarea.value += '\n'
      this.updateTextArea()
    },
    stopReplying () {
      this.$emit('stop-replying')
    },
    sendMessage () {
      if (!this.$refs.textarea.value) {
        return false
      }

      this.$emit('send', this.$refs.textarea.value) // TODO remove first / last empty lines
      this.$refs.textarea.value = ''
      this.updateTextArea()
      this.endMention()
    },
    createPool () {
      console.log('TODO')
    },
    selectEmoticon (emoticon) {
      this.$refs.textarea.value = this.$refs.textarea.value + emoticon.native
      this.closeEmoticon()
      this.updateTextWithLines()
    },
    startMention (keyword, position) {
      const all = makeMentionFromUsername('').all.slice(1)
      this.ephemeral.mention.options = this.users.concat([{
        // TODO: use group picture here or broadcast icon
        username: all, displayName: all, picture: '/assets/images/horn.png'
      }]).filter(user =>
        user.username.toUpperCase().includes(keyword.toUpperCase()) ||
        user.displayName.toUpperCase().includes(keyword.toUpperCase()))
      this.ephemeral.mention.position = position
      this.ephemeral.mention.index = 0
    },
    endMention () {
      this.ephemeral.mention.position = -1
      this.ephemeral.mention.index = -1
      this.ephemeral.mention.options = []
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$initialHeight: 43px;

.c-send {
  position: relative;
  margin: 0 1.5rem;
  display: block;
  padding: 1rem 0 2rem 0;

  @include tablet {
    margin: 0 2.5rem;
  }

  &-textarea,
  &-mask {
    display: block;
    width: 100%;
    min-height: $initialHeight;
    font-size: 1rem;
    word-wrap: break-word;
  }

  &-textarea {
    height: $initialHeight;
    resize: none;
    overflow: hidden;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &-mask {
    position: absolute;
    top: 1rem;
    left: 0;
    opacity: 0;
    pointer-events: none;
    height: auto;
  }

  &-actions {
    position: absolute;
    bottom: 2rem;
    right: 0;
    height: $initialHeight;
  }

  &-btn {
    padding: 0.5rem;
    padding-right: 1rem;
    color: $general_2;
    height: 100%;
    border-radius: 0 $radius $radius 0;

    &:focus {
      box-shadow: none;
      color: $text_1;
    }
  }

  &.is-editing {
    margin: 0;
    padding: 0;

    .c-send-actions {
      position: relative;
      margin-top: 0.5rem;
      bottom: 0;
      height: auto;
    }

    .is-outlined {
      margin-right: 0.5rem;
    }
  }
}

.inputgroup.is-editing .c-send-mask {
  top: 0;
}

.inputgroup .addons button.is-icon:focus {
  box-shadow: none;
  border: none;
}

.inputgroup .addons button.is-icon:first-child:last-child {
  width: 2rem;
}

.inputgroup .addons.addons-editing {
  top: -2.7rem;
}

.icon-smile-beam::before {
  font-weight: 400;
}

.emoji-mart {
  position: absolute;
  right: 0;
  bottom: 4rem;
  box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
}

.c-replying-wrapper {
  display: table;
  table-layout: fixed;
  width: 100%;
  position: absolute;
  top: -1rem;
}

.c-replying {
  display: table-cell;
  background-color: $general_2;
  padding: 0.4rem 2rem 0.5rem 0.5rem;
  border-radius: 0.3rem 0.3rem 0 0;
  margin-bottom: -0.2rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 0.75rem;
  font-size: $size_5;
  color: $text_1;
}

.c-jump-to-latest {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $general_2;
  padding: 0.2rem;
  border-radius: 0.3rem 0.3rem 0 0;
  font-size: $size_5;
  color: $text_1;
  text-align: center;
  cursor: pointer;
  position: absolute;
  left: 0;
  right: 0;
  top: -1rem;
}

.c-mentions {
  background-color: $general_2;
  border: 1px solid var(--general_0);
  border-radius: 0.3rem 0.3rem 0 0;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 5rem;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 12rem;
}

.c-mentions .c-mention-user {
  display: flex;
  align-items: center;
  padding: 0.2rem;
  cursor: pointer;
}

.c-mentions .c-mention-user.is-selected {
  background-color: $primary_2;
}

.c-mentions .c-mention-user .c-username {
  margin-left: 0.3rem;
}

.c-clear {
  position: absolute;
  right: 0.2rem;
  top: 0.2rem;
}

.c-send-button {
  border-radius: 0;
  margin-top: -1px;
  margin-right: 0;
  color: $white;
}
</style>
