<template lang='pug'>
.c-send.inputgroup(:class='{"is-editing": isEditing}')
  .c-replying(v-if='replyingMessage')
    i18n Replying to {{replyingTo}}:&nbsp
    | "{{ replyingMessage }}"
    button.c-clear.is-icon-small(
      :aria-label='L("Stop replying")'
      @click='$emit("stopReplying")'
    )
      i.icon-times

  textarea.textarea.c-send-textarea(
    ref='textarea'
    :disabled='loading'
    :placeholder='L("Write your message...")'
    :style='textareaStyles'
    @keydown.enter.exact.prevent='sendMessage'
    @keydown.ctrl='isNextLine'
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

    div(v-else)
      .addons
        tooltip(
          direction='top'
          :text='L("Create poll")'
        )
          button.is-icon(
            :aria-label='L("Create poll")'
            @click='createPool'
          )
            i.icon-poll

        tooltip(
          direction='top'
          :text='L("Add reaction")'
        )
          button.is-icon(
            :aria-label='L("Add reaction")'
            @click='openEmoticon'
          )
            i.icon-smile-beam

      i18n.sr-only(
        tag='button'
        :class='{ isActive }'
        @click='sendMessage'
      ) Send

  .textarea.c-send-mask(
    ref='mask'
    :style='maskStyles'
  )
</template>

<script>
import emoticonsMixins from './EmoticonsMixins.js'
import Tooltip from '@components/Tooltip.vue'

export default {
  name: 'Chatroom',
  mixins: [emoticonsMixins],
  components: {
    Tooltip
  },
  props: {
    title: String,
    searchPlaceholder: String,
    loading: {
      type: Boolean,
      default: false
    },
    replyingMessage: String,
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
        textWithLines: ''
      }
    }
  },
  mounted () {
    // Get actionsWidth to add a dynamic padding to textarea,
    // so those actions don't be above the textarea's value
    this.ephemeral.actionsWidth = this.isEditing ? 0 : this.$refs.actions.offsetWidth
    this.updateTextArea()
    this.$refs.textarea.focus()
  },
  computed: {
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
    }
  },
  methods: {
    isNextLine (e) {
      const enterKey = e.keyCode === 13
      if ((e.shiftKey || e.altKey || e.ctrlKey) && enterKey) {
        return this.createNewLine()
      }
    },
    handleKeyup (e) {
      if (e.keyCode === 13) e.preventDefault()
      else this.updateTextArea()
    },
    updateTextWithLines () {
      const newValue = this.$refs.textarea.value.replace(/\n/g, '<br>')
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

      const length = this.ephemeral.textWithLines.length
      const isLastLineEmpty = this.ephemeral.textWithLines.substring(length - 4, length) === '<br>'

      // TRICK: Use an invisible element (.mask) as placeholder to know the
      // amount of space the user message takes... (taking in account new lines)
      this.$refs.mask.innerHTML = this.ephemeral.textWithLines + (isLastLineEmpty ? '.' : '')

      // ...and apply the maks's height to the textarea so it dynamically grows as the user types
      this.ephemeral.maskHeight = this.$refs.mask.offsetHeight - 2

      // ... finaly inform the parent about the new height to adjust the layout
      this.$emit('height-update', this.ephemeral.maskHeight + 'px')
    },
    createNewLine () {
      this.$refs.textarea.value += '\n'
      this.updateTextArea()
    },
    sendMessage () {
      console.log('send')
      if (!this.$refs.textarea.value) {
        return false
      }

      this.$emit('send', this.$refs.textarea.value, this.replyingMessage) // TODO remove first / last empty lines
      this.$refs.textarea.value = ''
      this.updateTextArea()
    },
    createPool () {
      console.log('TODO')
    },
    selectEmoticon (emoticon) {
      this.$refs.textarea.value = this.$refs.textarea.value + emoticon.native
      this.closeEmoticon()
      this.updateTextWithLines()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$initialHeight: 43px;

.c-send {
  position: relative;
  margin: 0 2.5rem;
  display: block;
  padding-bottom: .1rem;

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

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &-mask {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
    height: auto;
  }

  &-actions {
    position: absolute;
    bottom: 0;
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

    .c-send-actions {
      position: relative;
      margin-top: .5rem;
      height: auto;
    }

    .is-outlined {
      margin-right: .5rem;
    }
  }
}

.inputgroup .addons button.is-icon:focus {
  box-shadow: none;
  border: none;
}

.inputgroup .addons button.is-icon:first-child:last-child {
  width: 2rem;
}

.icon-smile-beam::before {
  font-weight: 400;
}

.emoji-mart {
  position: absolute;
  right: 0;
  bottom: 4rem;
  box-shadow: 0px 0.5rem 1.25rem rgba(54, 54, 54, 0.3);
}

.c-replying {
  background-color: $general_2;
  padding: 0.5rem 2rem 0.7rem 0.5rem;
  border-radius: .3rem .3rem 0 0;
  margin-bottom: -0.2rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-size: 0.75rem;
  font-size: $size_5;
  color: $text_1;
}

.c-clear {
  position: absolute;
  right: .2rem;
  top: .4rem;
}
</style>
