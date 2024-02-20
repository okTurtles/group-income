<template lang='pug'>
.c-send-wrapper(
  :class='{"is-public": isPublicChannel}'
)
  .c-typing-indicator(v-if='typingIndicatorSentence' v-safe-html='typingIndicatorSentence')

  .c-public-helper(v-if='isPublicChannel')
    i.icon-exclamation-triangle.is-prefix
    i18n.has-text-bold This channel is public and everyone on the internet can see its content.

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
          @click.stop='onClickMention(index)'
        )
          avatar(:src='user.picture' size='xs')
          .c-username {{user.username}}
          .c-display-name(
            v-if='user.displayName !== user.username'
          ) ({{user.displayName}})

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
      @blur='textAreaBlur'
      @keydown.enter.exact.prevent='handleKeyDownEnter'
      @keydown.tab.exact='handleKeyDownTab'
      @keydown.ctrl='isNextLine'
      @keydown='handleKeydown'
      @keyup='handleKeyup'
      v-bind='$attrs'
    )

    chat-attachment-preview(
      v-if='ephemeral.attachment.length'
      :attachmentList='ephemeral.attachment'
      @remove='removeAttachment'
    )

    .c-send-actions(ref='actions')
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
          tooltip(
            direction='top'
            :text='L("Bold")'
          )
            button.is-icon(
              :aria-label='L("Bold style text")'
              @mousedown='transformTextSelectionToMarkdown($event, "bold")'
            )
              i.icon-bold
          tooltip(
            direction='top'
            :text='L("Italic")'
          )
            button.is-icon(
              :aria-label='L("Italic style text")'
              @mousedown='transformTextSelectionToMarkdown($event, "italic")'
            )
              i.icon-italic
          tooltip(
            direction='top'
            :text='L("Code")'
          )
            button.is-icon(
              :aria-label='L("Add code")'
              @mousedown='transformTextSelectionToMarkdown($event, "code")'
            )
              i.icon-code
          tooltip(
            direction='top'
            :text='L("Strikethrough")'
          )
            button.is-icon(
              :aria-label='L("Add strikethrough")'
              @mousedown='transformTextSelectionToMarkdown($event, "strikethrough")'
            )
              i.icon-strikethrough
          tooltip(
            direction='top'
            :text='L("Link")'
          )
            button.is-icon(
              :aria-label='L("Add link")'
              @mousedown='transformTextSelectionToMarkdown($event, "link")'
            )
              i.icon-link

      .c-edit-actions(v-if='isEditing')
        i18n.is-small.is-outlined(
          tag='button'
          @click='$emit("cancelEdit")'
        ) Cancel

        i18n.button.is-small(
          tag='button'
          @click='sendMessage'
        ) Save changes

      .c-edit-action-wrapper(v-else)
        .addons(v-if='ephemeral.showButtons')
          tooltip(
            direction='top'
            :text='L("Bold")'
          )
            button.is-icon(
              :aria-label='L("Bold style text")'
              @mousedown='transformTextSelectionToMarkdown($event, "bold")'
            )
              i.icon-bold
          tooltip(
            direction='top'
            :text='L("Italic")'
          )
            button.is-icon(
              :aria-label='L("Italic style text")'
              @mousedown='transformTextSelectionToMarkdown($event, "italic")'
            )
              i.icon-italic
          tooltip(
            direction='top'
            :text='L("Code")'
          )
            button.is-icon(
              :aria-label='L("Add code")'
              @mousedown='transformTextSelectionToMarkdown($event, "code")'
            )
              i.icon-code
          tooltip(
            direction='top'
            :text='L("Strikethrough")'
          )
            button.is-icon(
              :aria-label='L("Add strikethrough")'
              @mousedown='transformTextSelectionToMarkdown($event, "strikethrough")'
            )
              i.icon-strikethrough
          tooltip(
            direction='top'
            :text='L("Link")'
          )
            button.is-icon(
              :aria-label='L("Add link")'
              @mousedown='transformTextSelectionToMarkdown($event, "link")'
            )
              i.icon-link

        .primary-ctas
          .addons(v-if='ephemeral.showButtons')
            tooltip(
              direction='top'
              :text='L("Create poll")'
            )
              button.is-icon(
                :aria-label='L("Create poll")'
                @click='openCreatePollModal'
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
            tooltip(
              direction='top'
              :text='L("Attach file")'
            )
              button.is-icon.c-file-attachment-btn(
                :aria-label='L("Attach file")'
                @click='openFileAttach'
              )
                i.icon-paper-clip
                input(
                  ref='fileAttachmentInputEl'
                  type='file'
                  multiple
                  :accept='supportedFileExtensions'
                  @change='fileAttachmentHandler($event.target.files)'
                )

          .c-send-button(
            id='mobileSendButton'
            tag='button'
            :class='{ isActive }'
            @click='sendMessage'
          )
            .icon-paper-plane

    .textarea.c-send-mask(
      ref='mask'
    )

    create-poll.c-poll(ref='poll')
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { mapGetters } from 'vuex'
import emoticonsMixins from './EmoticonsMixins.js'
import CreatePoll from './CreatePoll.vue'
import Avatar from '@components/Avatar.vue'
import Tooltip from '@components/Tooltip.vue'
import ChatAttachmentPreview from './file-attachment/ChatAttachmentPreview.vue'
import { makeMentionFromUsername } from '@model/contracts/shared/functions.js'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/shared/constants.js'
import { CHAT_ATTACHMENT_SUPPORTED_EXTENSIONS } from '~/frontend/utils/constants.js'
import { OPEN_MODAL, CHATROOM_USER_TYPING, CHATROOM_USER_STOP_TYPING } from '@utils/events.js'
import { uniq, throttle } from '@model/contracts/shared/giLodash.js'
import { injectOrStripSpecialChar, injectOrStripLink } from '@view-utils/convert-to-markdown.js'

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
    Tooltip,
    CreatePoll,
    ChatAttachmentPreview
  },
  props: {
    defaultText: String,
    scrolledUp: Boolean,
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
        textWithLines: '',
        maskHeight: '',
        showButtons: true,
        isPhone: false,
        mention: {
          position: -1,
          options: [],
          index: -1
        },
        attachment: [], // [ { url: instace of URL.createObjectURL , name: string }, ... ]
        typingUsers: []
      },
      typingUserTimeoutIds: {},
      throttledEmitUserTypingEvent: throttle(this.emitUserTypingEvent, 500)
    }
  },
  watch: {
    replyingMessage () {
      this.focusOnTextArea()
    },
    loading (newValue, oldValue) {
      if (!newValue) {
        this.$nextTick(() => {
          this.focusOnTextArea()
        })
      }
    }
  },
  created () {
    // TODO #492 create a global Vue Responsive just for media queries.
    const mediaIsPhone = window.matchMedia('(hover: none) and (pointer: coarse)')
    this.ephemeral.isPhone = mediaIsPhone.matches
    mediaIsPhone.onchange = (e) => { this.ephemeral.isPhone = e.matches }
  },
  mounted () {
    this.$refs.textarea.value = this.defaultText || ''
    // Get actionsWidth to add a dynamic padding to textarea,
    // so those actions don't be above the textarea's value
    this.ephemeral.actionsWidth = this.isEditing ? 0 : this.$refs.actions.offsetWidth
    this.updateTextArea()
    this.focusOnTextArea()

    window.addEventListener('click', this.onWindowMouseClicked)
    sbp('okTurtles.events/on', CHATROOM_USER_TYPING, this.onUserTyping)
    sbp('okTurtles.events/on', CHATROOM_USER_STOP_TYPING, this.onUserStopTyping)
  },
  beforeDestroy () {
    window.removeEventListener('click', this.onWindowMouseClicked)
    sbp('okTurtles.events/off', CHATROOM_USER_TYPING, this.onUserTyping)
    sbp('okTurtles.events/off', CHATROOM_USER_STOP_TYPING, this.onUserStopTyping)
  },
  computed: {
    ...mapGetters([
      'chatRoomMembers',
      'currentChatRoomId',
      'chatRoomAttributes',
      'ourContactProfilesById',
      'globalProfile',
      'ourIdentityContractId'
    ]),
    members () {
      return Object.keys(this.chatRoomMembers)
        .map(memberID => {
          const { username, displayName, picture } = this.ourContactProfilesById[memberID]
          return {
            memberID,
            username,
            displayName: displayName || username || memberID,
            picture
          }
        })
    },
    isActive () {
      return this.ephemeral.textWithLines
    },
    textareaStyles () {
      return {
        height: this.ephemeral.maskHeight + 'px'
      }
    },
    isPublicChannel () {
      return this.chatRoomAttributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PUBLIC
    },
    supportedFileExtensions () {
      return CHAT_ATTACHMENT_SUPPORTED_EXTENSIONS.join(',')
    },
    typingIndicatorSentence () {
      const userArr = this.ephemeral.typingUsers

      if (userArr.length) {
        const getDisplayName = (memberID) => {
          const profile = this.globalProfile(memberID)
          return profile?.displayName || profile?.username || memberID
        }
        const isMultiple = userArr.length > 1
        const usernameCombined = userArr.map(u => getDisplayName(u)).join(', ')

        return isMultiple
          ? L('{strong_}{users}{_strong} are typing', { users: usernameCombined, ...LTags('strong') })
          : L('{strong_}{user}{_strong} is typing', { user: usernameCombined, ...LTags('strong') })
      } else {
        return null
      }
    }
  },
  methods: {
    focusOnTextArea () {
      if (this.$refs.textarea) {
        this.$refs.textarea.focus()
      }
    },
    textAreaBlur (event) {
      if (!this.ephemeral.isPhone) {
        return
      }

      if (event?.relatedTarget?.id === 'mobileSendButton') {
        this.sendMessage()
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
    onClickMention (index) {
      this.$refs.textarea.focus()
      this.addSelectedMention(index)
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
      if (e.keyCode === 13) {
        e.preventDefault()
      } else {
        this.updateTextArea()
      }

      if (!caretKeyCodeValues[e.keyCode] && !functionalKeyCodeValues[e.keyCode]) {
        this.updateMentionKeyword()
      }
    },
    addSelectedMention (index) {
      const curValue = this.$refs.textarea.value
      const curPosition = this.$refs.textarea.selectionStart
      const selection = this.ephemeral.mention.options[index]

      const mentionObj = makeMentionFromUsername(selection.username || selection.memberID, true)
      const mention = selection.memberID === mentionObj.all ? mentionObj.all : mentionObj.me
      const value = curValue.slice(0, this.ephemeral.mention.position) +
         mention + ' ' + curValue.slice(curPosition)
      this.$refs.textarea.value = value
      const selectionStart = this.ephemeral.mention.position + mention.length + 1
      this.moveCursorTo(selectionStart)
      this.endMention()
    },
    moveCursorTo (index) {
      this.$refs.textarea.setSelectionRange(index, index)
    },
    updateTextWithLines () {
      const newValue = this.$refs.textarea.value
      if (this.ephemeral.textWithLines === newValue) {
        return false
      }

      if (!newValue) {
        // if the textarea has become empty, emit CHATROOM_USER_STOP_TYPING event.
        sbp('gi.actions/chatroom/user-stop-typing-event', {
          contractID: this.currentChatRoomId
        }).catch(e => {
          console.error('Error emitting user stopped typing event', e)
        })
      } else if (this.ephemeral.textWithLines.length < newValue.length) {
        // if the user is typing and the textarea value is growing, emit CHATROOM_USER_TYPING event.
        this.throttledEmitUserTypingEvent()
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
    },
    createNewLine () {
      this.$refs.textarea.value += '\n'
      this.updateTextArea()
    },
    stopReplying () {
      this.$emit('stop-replying')
    },
    sendMessage () {
      const hasAttachments = this.ephemeral.attachment.length > 0
      const getName = entry => entry.name

      if (!this.$refs.textarea.value && !hasAttachments) { // nothing to send
        return false
      }

      let msgToSend = this.$refs.textarea.value || ''
      if (hasAttachments) {
        // TODO: remove this block and implement file-attachment properly once it's implemented in the back-end.
        msgToSend = msgToSend +
          (msgToSend ? '\r\n' : '') +
          `{ Attached: ${this.ephemeral.attachment.map(getName).join(', ')} } - Feature coming soon!`

        this.clearAllAttachments()
      }

      /* Process mentions in the form @username => @userID */
      const mentionStart = makeMentionFromUsername('').all[0]
      const availableMentions = this.members.map(memberID => memberID.username)
      msgToSend = msgToSend.replace(
        // This regular expression matches all @username mentions that are
        // standing alone between spaces
        new RegExp(`(?<=\\s|^)${mentionStart}(${availableMentions.join('|')})(?=[^\\w\\d]|$)`, 'g'),
        (_, username) => {
          return makeMentionFromUsername(username).me
        }
      )

      this.$emit('send', msgToSend) // TODO remove first / last empty lines
      this.$refs.textarea.value = ''
      this.updateTextArea()
      this.endMention()
    },
    openCreatePollModal () {
      const bbox = this.$el.getBoundingClientRect()
      this.$refs.poll.open({
        right: `${window.innerWidth - bbox.right + 24}px`, // 24 -> 1.5rem padding-left
        bottom: `${innerHeight - bbox.top + 8}px` // 8 -> 0.5rem gap
      })
    },
    openFileAttach (e) {
      if (e.target.matches('input')) { return }

      e.target.blur()
      this.$refs.fileAttachmentInputEl.click()
    },
    fileAttachmentHandler (filesList, appendItems = false) {
      const getFileExtension = name => {
        const lastDotIndex = name.lastIndexOf('.')
        return lastDotIndex === -1 ? '' : name.substring(lastDotIndex).toLowerCase()
      }
      const attachmentsExist = Boolean(this.ephemeral.attachment.length)
      const list = appendItems && attachmentsExist
        ? [...this.ephemeral.attachment]
        : []

      if (attachmentsExist) {
        // make sure to clear the previous state if there is already attached file(s).
        this.clearAllAttachments()
      }

      for (const file of filesList) {
        const fileExt = getFileExtension(file.name)
        const fileUrl = URL.createObjectURL(file)
        const fileSize = file.size

        if (fileSize > Math.pow(10, 9)) {
          // TODO: update Math.pow(10, 9) above with the value delivered from the server once it's implemented there.
          return sbp('okTurtles.events/emit', OPEN_MODAL, 'ChatFileAttachmentWarningModal', { type: 'large' })
        } else if (!fileExt || !CHAT_ATTACHMENT_SUPPORTED_EXTENSIONS.includes(fileExt)) {
          // Give users a warning about unsupported file types
          return sbp('okTurtles.events/emit', OPEN_MODAL, 'ChatFileAttachmentWarningModal', { type: 'unsupported' })
        }

        list.push({
          url: fileUrl,
          name: file.name,
          extension: fileExt,
          attachType: file.type.match('image/') ? 'image' : 'non-image'
        })
      }

      this.ephemeral.attachment = list
    },
    clearAllAttachments () {
      this.ephemeral.attachment.forEach(attachment => {
        URL.revokeObjectURL(attachment.url)
      })
      this.ephemeral.attachment = []
    },
    removeAttachment (targetUrl) {
      // when a URL is no longer needed, it needs to be released from the memory.
      // (reference: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static#memory_management)
      const targetIndex = this.ephemeral.attachment.findIndex(entry => targetUrl === entry.url)

      if (targetIndex >= 0) {
        URL.revokeObjectURL(targetUrl)
        this.ephemeral.attachment.splice(targetIndex, 1)
      }
    },
    selectEmoticon (emoticon) {
      this.$refs.textarea.value = this.$refs.textarea.value + emoticon.native
      this.closeEmoticon()
      this.updateTextWithLines()
    },
    startMention (keyword, position) {
      const all = makeMentionFromUsername('').all
      const availableMentions = Array.from(this.members)
      // NOTE: '@all' mention should only be needed when the members are more than 3
      if (availableMentions.length > 2) {
        availableMentions.push({
          memberID: all,
          displayName: all.slice(1),
          picture: '/assets/images/horn.png'
        })
      }
      const normalKeyword = keyword.normalize().toUpperCase()
      this.ephemeral.mention.options = availableMentions.filter(user =>
        user.username?.normalize().toUpperCase().includes(normalKeyword) ||
        user.displayName?.normalize().toUpperCase().includes(normalKeyword))
      this.ephemeral.mention.position = position
      this.ephemeral.mention.index = 0
    },
    endMention () {
      this.ephemeral.mention.position = -1
      this.ephemeral.mention.index = -1
      this.ephemeral.mention.options = []
    },
    onWindowMouseClicked (e) {
      if (!this.$refs.mentionWrapper) {
        return
      }
      const element = document.elementFromPoint(e.clientX, e.clientY).closest('.c-mentions')
      if (!element) {
        this.endMention()
      }
    },
    transformTextSelectionToMarkdown (e, type) {
      e.preventDefault() // Calling e.preventDefault() in 'mousedown' event listener prevents the button from being focused upon click.

      const prevFocusElement = document.activeElement // the captured activeElement inside 'mousedown' handler is still a previously focused element.
      const inputEl = this.$refs.textarea
      const selStart = inputEl.selectionStart
      const selEnd = inputEl.selectionEnd
      const inputValue = inputEl.value

      // Check if call-to-action buttons are clicked while a string segment of the input field is selected.
      if (prevFocusElement === inputEl && (selStart !== selEnd)) {
        let result
        switch (type) {
          case 'bold':
          case 'italic':
          case 'code':
          case 'strikethrough': {
            result = injectOrStripSpecialChar(inputValue, type, selStart, selEnd)
            inputEl.value = result.output
            this.moveCursorTo(result.focusIndex)
            break
          }
          case 'link': {
            result = injectOrStripLink(inputValue, selStart, selEnd)
            inputEl.value = result.output
            this.$refs.textarea.setSelectionRange(result.focusIndex.start, result.focusIndex.end)
          }
        }
      }
    },
    onUserTyping (data) {
      if (data.contractID !== this.currentChatRoomId) return
      const typingUser = data.innerSigningContractID

      if (typingUser && typingUser !== this.ourIdentityContractId) {
        const addToList = username => {
          this.ephemeral.typingUsers = uniq([...this.ephemeral.typingUsers, username])
        }

        addToList(typingUser)
        clearTimeout(this.typingUserTimeoutIds[typingUser])
        this.typingUserTimeoutIds[typingUser] = setTimeout(() => this.removeFromTypingUsersArray(typingUser), 30 * 1000)
      }
    },
    onUserStopTyping (data) {
      if (data.contractID !== this.currentChatRoomId) return
      const typingUser = data.innerSigningContractID

      if (typingUser && typingUser !== this.ourIdentityContractId) {
        this.removeFromTypingUsersArray(typingUser)
      }
    },
    removeFromTypingUsersArray (memberID) {
      this.ephemeral.typingUsers = this.ephemeral.typingUsers.filter(u => u !== memberID)

      if (this.typingUserTimeoutIds[memberID]) {
        clearTimeout(this.typingUserTimeoutIds[memberID])
        delete this.typingUserTimeoutIds[memberID]
      }
    },
    emitUserTypingEvent () {
      sbp('gi.actions/chatroom/user-typing-event', {
        contractID: this.currentChatRoomId
      }).catch(e => {
        console.error('Error emitting user typing event', e)
      })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-send-wrapper {
  position: relative;
  padding: 1rem 1rem 1.6rem;

  @include tablet {
    padding: 0 1.25rem 1.6rem 1.25rem;
  }

  &.is-public {
    background-color: var(--warning_1);

    .c-public-helper {
      color: $text_0;
      margin-bottom: 1rem;

      i {
        color: var(--warning_0);
      }
    }

    .inputgroup {
      border-color: var(--warning_0);
    }
  }
}

.c-send {
  position: relative;
  display: block;
  background-color: var(--background_0);
  border: 1px solid var(--general_0);
  border-radius: 0.25rem;

  &-textarea,
  &-mask {
    display: block;
    width: 100%;
    font-size: 1rem;
    word-wrap: break-word;
  }

  &-textarea {
    resize: none;
    overflow: hidden;
    height: 2.75rem;
    min-height: 2.75rem;
    background-color: transparent;
    border: none;
    padding: 0.5rem;

    &::-webkit-scrollbar {
      display: none;
    }

    &:focus {
      box-shadow: 0 0 0 2px transparent;
    }
  }

  &-mask {
    position: absolute;
    top: 1rem;
    left: 0;
    opacity: 0;
    pointer-events: none;
    height: auto;
    white-space: pre-line;
    min-height: 0;
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
      margin-bottom: 0.5rem;
      bottom: 0;
      height: auto;
      display: flex;
      justify-content: space-between;

      @include phone {
        flex-wrap: wrap;
        row-gap: 0.75rem;
      }

      .c-edit-actions {
        margin-right: 0.5rem;
        margin-left: 0.5rem;
      }
    }

    .is-outlined {
      margin-right: 0.5rem;
    }
  }
}

.inputgroup.is-editing .c-send-mask {
  top: 0;
}

.primary-ctas {
  display: flex;
  align-items: center;

  .addons {
    margin-right: 0.5rem;
  }
}

.inputgroup .addons {
  position: relative;
  margin-left: 0.25rem;

  &.addons-editing {
    display: flex;
    width: 100%;
  }

  button.is-icon:focus {
    box-shadow: none;
    border: none;
  }

  button.is-icon:first-child:last-child {
    width: 1.825rem;
  }
}

.c-file-attachment-btn {
  position: relative;
  overflow: hidden;

  input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
}

.c-edit-action-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  top: -2.1rem;
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
  top: -2.125rem;
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

  &.is-selected {
    background-color: $primary_2;
  }

  .c-username {
    margin-left: 0.3rem;
  }

  .c-display-name {
    margin-left: 0.3rem;
    color: $text_1;
  }
}

.c-clear {
  position: absolute;
  right: 0.2rem;
  top: 0.2rem;
}

.c-send-button {
  color: $white;
  background: $general_0;
  background: grey;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  height: 2rem;
  width: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0.25rem;

  &:hover {
    color: var(--primary_0);
    cursor: pointer;
  }

  &.isActive {
    background: $primary_0;
  }
}

.c-typing-indicator {
  position: absolute;
  bottom: 0.2rem;
  left: 1rem;
  display: block;
  font-size: 0.675rem;
  padding: 0.25rem 0.25rem;
}
</style>
