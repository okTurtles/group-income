<template lang='pug'>
.c-send-wrapper(
  :class='{"is-public": isPublicChannel}'
)
  .c-typing-indicator(v-if='typingIndicatorSentence' v-safe-html='typingIndicatorSentence')

  .c-public-helper(v-if='isPublicChannel')
    i.icon-exclamation-triangle.is-prefix
    i18n.has-text-bold This channel is public and everyone on the internet can see its content.

  fieldset.c-send.inputgroup(
    :class='{"is-editing": isEditing}'
    :disabled='loading'
    data-test='messageInputWrapper'
  )
    .c-mentions(
      v-if='ephemeral.mention.options.length'
      ref='mentionWrapper'
    )
      template(v-if='ephemeral.mention.type === "member"')
        .c-mention-user(
          v-for='(user, index) in ephemeral.mention.options'
          :key='user.memberID'
          ref='mention'
          :class='{"is-selected": index === ephemeral.mention.index}'
          @click.stop='onClickMention(index)'
        )
          avatar(:src='user.picture' size='xs')
          .c-username {{user.username}}
          .c-display-name(
            v-if='user.displayName !== user.username'
          ) ({{user.displayName}})

      template(v-else-if='ephemeral.mention.type ==="channel"')
        .c-mention-channel(
          v-for='(channel, index) in ephemeral.mention.options'
          :key='channel.id'
          ref='mention'
          :class='{"is-selected": index === ephemeral.mention.index}'
          @click.stop='onClickMention(index)'
        )
          i(:class='[channel.privacyLevel === "private" ? "icon-lock" : "icon-hashtag", "c-channel-icon"]')
          .c-channel-name {{ channel.name }}

    .c-jump-to-latest(
      v-if='scrolledUp && !replyingMessage'
      @click='$emit("jump-to-latest")'
    )
      i18n Jump to latest message
      button.is-icon-small
        i.icon-arrow-down

    .c-reply-wrapper
      .c-reply(v-if='replyingMessage')
        i18n(:args='{ replyingTo, text: swapMentionIDForDisplayname(replyingMessage.text) }') Replying to {replyingTo}: "{text}"
        button.c-clear.is-icon-small(
          :aria-label='L("Stop replying")'
          @click='stopReplying'
        )
          i.icon-times

    textarea.textarea.c-send-textarea(
      ref='textarea'
      :placeholder='L("Write your message...")'
      :style='textareaStyles'
      :maxlength='config.messageMaxChar'
      @click='textAreaFocus'
      @focus='textAreaFocus'
      @blur='textAreaBlur'
      @keydown.enter.exact='handleKeyDownEnter'
      @keydown.tab.exact='handleKeyDownTab'
      @keydown.ctrl='isNextLine'
      @keydown='handleKeydown'
      @keyup='handleKeyup'
      @input='config.debouncedHandleInput'
      @paste='handlePaste'
      v-bind='$attrs'
    )

    chat-attachment-preview(
      v-if='ephemeral.attachments.length'
      :attachmentList='ephemeral.attachments'
      :ownerID='ourIdentityContractId'
      @remove='removeAttachment'
    )

    .c-send-actions(ref='actions')
      div(v-if='isEditing')
        .addons.addons-editing
          tooltip(
            v-if='ephemeral.showButtons'
            direction='top'
            :text='L("Add reaction")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add reaction")'
              @click='openEmoticon'
            )
              i.icon-smile-beam
          tooltip(
            direction='top'
            :text='L("Bold")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Bold style text")'
              @mousedown.prevent='transformTextSelectionToMarkdown("bold")'
            )
              i.icon-bold
          tooltip(
            direction='top'
            :text='L("Italic")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Italic style text")'
              @mousedown.prevent='transformTextSelectionToMarkdown("italic")'
            )
              i.icon-italic
          tooltip(
            direction='top'
            :text='L("Code")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add code")'
              @mousedown.prevent='transformTextSelectionToMarkdown("code")'
            )
              i.icon-code
          tooltip(
            direction='top'
            :text='L("Strikethrough")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add strikethrough")'
              @mousedown.prevent='transformTextSelectionToMarkdown("strikethrough")'
            )
              i.icon-strikethrough
          tooltip(
            direction='top'
            :text='L("Link")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add link")'
              @mousedown.prevent='transformTextSelectionToMarkdown("link")'
            )
              i.icon-link

      .c-edit-actions(v-if='isEditing')
        i18n.is-small.is-outlined(
          tag='button'
          @click='cancelEditing'
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
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Bold style text")'
              @mousedown.prevent='transformTextSelectionToMarkdown("bold")'
            )
              i.icon-bold
          tooltip(
            direction='top'
            :text='L("Italic")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Italic style text")'
              @mousedown.prevent='transformTextSelectionToMarkdown("italic")'
            )
              i.icon-italic
          tooltip(
            direction='top'
            :text='L("Code")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add code")'
              @mousedown.prevent='transformTextSelectionToMarkdown("code")'
            )
              i.icon-code
          tooltip(
            direction='top'
            :text='L("Strikethrough")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add strikethrough")'
              @mousedown.prevent='transformTextSelectionToMarkdown("strikethrough")'
            )
              i.icon-strikethrough
          tooltip(
            direction='top'
            :text='L("Link")'
            :deactivated='ephemeral.isPhone'
          )
            button.is-icon(
              :aria-label='L("Add link")'
              @mousedown.prevent='transformTextSelectionToMarkdown("link")'
            )
              i.icon-link

        .primary-ctas
          .addons(v-if='ephemeral.showButtons')
            tooltip(
              direction='top'
              :text='L("Create poll")'
            )
              button.is-icon(
                data-test='createPoll'
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
                  data-test='attachments'
                  @change='fileAttachmentHandler($event.target.files)'
                )

          button.c-send-button(
            id='mobileSendButton'
            type='submit'
            data-test='sendMessageButton'
            :class='{ isActive }'
            @click='sendMessage'
          )
            .icon-paper-plane

    .textarea.c-send-mask(
      ref='mask'
    )

    create-poll.c-poll(ref='poll' @created-poll='$emit("jump-to-latest")')
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
import { makeMentionFromUsername, makeChannelMention, swapMentionIDForDisplayname } from '@model/chatroom/utils.js'
import {
  CHATROOM_PRIVACY_LEVEL,
  CHATROOM_MEMBER_MENTION_SPECIAL_CHAR,
  CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR,
  CHATROOM_MAX_MESSAGE_LEN,
  CHATROOM_ATTACHMENT_TYPES
} from '@model/contracts/shared/constants.js'
import { CHAT_ATTACHMENT_SIZE_LIMIT, IMAGE_ATTACHMENT_MAX_SIZE } from '~/frontend/utils/constants.js'
import { OPEN_MODAL, CHATROOM_USER_TYPING, CHATROOM_USER_STOP_TYPING } from '@utils/events.js'
import { uniq, throttle, cloneDeep, debounce } from 'turtledash'
import {
  injectOrStripSpecialChar,
  injectOrStripLink,
  splitStringByMarkdownCode,
  combineMarkdownSegmentListIntoString
} from '@view-utils/markdown-utils.js'
import { getFileType } from '@view-utils/filters.js'

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
    replyingMessage: {
      type: Object, // { text: '', hash: '' }
      default: function () {
        return null
      }
    },
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
          index: -1,
          type: 'member' // enum of ['member', 'channel']
        },
        attachments: [], // [ { url: instace of URL.createObjectURL , name: string }, ... ]
        staleObjectURLs: [],
        typingUsers: []
      },
      config: {
        messageMaxChar: CHATROOM_MAX_MESSAGE_LEN,
        // NOTE: Below is a fix for the issue #2369 and #2577, which are issues related to paste action on mobile devices.
        //       <textarea /> in this component handles two-way binding of the entered text using 'keydown' and 'keyup' events instead of the traditional v-model due to
        //       various functional requirements. But 'paste' action on mobile is not detected by them because they are done via touching the menu on the screen instead, not by pressing keyboard keys.
        //       We can detect this pasted content by running this.updateTextWithLines() for 'input' event. But this does not need to be done for every key stroke, hence the debounce.
        debouncedHandleInput: debounce(this.updateTextArea, 250)
      },
      typingUserTimeoutIds: {},
      throttledEmitUserTypingEvent: throttle(this.emitUserTypingEvent, 500),
      mediaIsPhone: null
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
    },
    currentChatRoomId () {
      if (this.ephemeral.typingUsers.length) {
        this.ephemeral.typingUsers = []
      }
    }
  },
  created () {
    // TODO #492 create a global Vue Responsive just for media queries.
    this.mediaIsPhone = window.matchMedia('(hover: none) and (pointer: coarse)')
    this.ephemeral.isPhone = this.mediaIsPhone.matches
    this.mediaIsPhone.onchange = (e) => { this.ephemeral.isPhone = e.matches }
  },
  mounted () {
    this.$refs.textarea.value = this.defaultText || ''
    // Get actionsWidth to add a dynamic padding to textarea,
    // so those actions don't be above the textarea's value
    this.ephemeral.actionsWidth = this.isEditing ? 0 : this.$refs.actions.offsetWidth
    this.updateTextArea()
    // The following causes inconsistent focusing on iOS depending on whether
    // iOS determines the action to be a result of user interaction.
    // Commenting this out will result on focus being triggered the 'normal'
    // way, when the chatroom is ready.
    this.focusOnTextArea()

    window.addEventListener('click', this.onWindowMouseClicked)
    sbp('okTurtles.events/on', CHATROOM_USER_TYPING, this.onUserTyping)
    sbp('okTurtles.events/on', CHATROOM_USER_STOP_TYPING, this.onUserStopTyping)
  },
  beforeDestroy () {
    window.removeEventListener('click', this.onWindowMouseClicked)
    sbp('okTurtles.events/off', CHATROOM_USER_TYPING, this.onUserTyping)
    sbp('okTurtles.events/off', CHATROOM_USER_STOP_TYPING, this.onUserStopTyping)

    this.mediaIsPhone.onchange = null // change handler needs to be destoryed to prevent memory leak.
    this.ephemeral.staleObjectURLs.forEach(url => {
      URL.revokeObjectURL(url)
    })
  },
  computed: {
    ...mapGetters([
      'chatRoomMembers',
      'currentChatRoomId',
      'isDirectMessage',
      'chatRoomAttributes',
      'ourContactProfilesById',
      'globalProfile',
      'groupProfiles',
      'ourIdentityContractId',
      'mentionableChatroomsInDetails'
    ]),
    activeMembers () {
      const activeGroupMemberIds = Object.keys(this.groupProfiles)
      const isInDM = this.isDirectMessage(this.currentChatRoomId)

      return Object.keys(this.chatRoomMembers)
        .filter(memberID => isInDM || activeGroupMemberIds.includes(memberID))
        .map(memberID => {
          const { username, displayName, picture } = this.ourContactProfilesById[memberID] || {}
          return {
            memberID,
            username,
            displayName: displayName || username || memberID,
            picture
          }
        })
    },
    isActive () {
      return this.hasAttachments || this.ephemeral.textWithLines
    },
    textareaStyles () {
      return {
        height: this.ephemeral.maskHeight + 'px'
      }
    },
    isPublicChannel () {
      return this.chatRoomAttributes.privacyLevel === CHATROOM_PRIVACY_LEVEL.PUBLIC
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
    },
    hasAttachments () {
      return this.ephemeral.attachments.length > 0
    }
  },
  methods: {
    focusOnTextArea () {
      if (this.$refs.textarea) {
        this.$refs.textarea.focus()
      }
    },
    textAreaFocus (event) {
      // Sometimes, on mobile, the virtual hardware keyboard appears
      // over the page. This doesn't seem to be detectable, but scrolling
      // seems to work around it.
      // This issue seems to affect Blink on Android. A delay is needed to
      // compensate for the keyboard animation.
      // NOTE: This test will not work when requesting a 'desktop website', as
      // then the user agent typically will not mention Android.
      if (/android/i.test(navigator.userAgent)) {
        setTimeout(() => this.$el.scrollIntoView(), 500)
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
      const channelCharIndex = value.lastIndexOf(CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR)
      const memberCharIndex = value.lastIndexOf(CHATROOM_MEMBER_MENTION_SPECIAL_CHAR)

      if (channelCharIndex === -1 && memberCharIndex === -1) {
        return this.endMention()
      }

      const lastIndex = Math.max(channelCharIndex, memberCharIndex)
      const mentionType = channelCharIndex > memberCharIndex ? 'channel' : 'member'
      const regExWordStart = /(\s)/g // RegEx Metacharacter \s

      if (lastIndex > 0 && !regExWordStart.test(value[lastIndex - 1])) {
        return this.endMention()
      }

      value = value.slice(lastIndex + 1)
      if (regExWordStart.test(value)) {
        return this.endMention()
      }

      this.startMention(value, lastIndex, mentionType)
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
        } else if (!nChoices && e.keyCode === caretKeyCodes.Esc) {
          this.cancelEditing()
        } else {
          this.endMention()
        }
      }
    },
    onClickMention (index) {
      this.$refs.textarea.focus()
      this.addSelectedMention(index)
    },
    handleKeyDownEnter (e) {
      const isNotPhone = !this.ephemeral.isPhone

      if (this.ephemeral.mention.options.length) {
        this.addSelectedMention(this.ephemeral.mention.index)
      } else if (isNotPhone) {
        this.sendMessage()
      }

      isNotPhone && e.preventDefault()
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
    handlePaste (e) {
      if (e.clipboardData.files.length > 0) {
        this.fileAttachmentHandler(e.clipboardData.files)
      }
    },
    addSelectedMention (index) {
      const curValue = this.$refs.textarea.value
      const curPosition = this.$refs.textarea.selectionStart
      const {
        options,
        position: mentionStartPosition,
        type: mentionType
      } = this.ephemeral.mention
      const selection = options[index]
      let mentionString = ''

      if (mentionType === 'member') {
        const mentionObj = makeMentionFromUsername(selection.username || selection.memberID, true)
        mentionString = selection.memberID === mentionObj.all
          ? mentionObj.all
          : mentionObj.me
      } else if (mentionType === 'channel') {
        mentionString = makeChannelMention(selection.name)
      }

      // Insert the selected mention into the input text.
      const value = curValue.slice(0, mentionStartPosition) +
        mentionString + ' ' + curValue.slice(curPosition)
      this.$refs.textarea.value = value

      // Move the cursor in the text-input to the end of the inserted mention string, and hide the selection menu.
      const selectionStart = mentionStartPosition + mentionString.length + 1
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
        this.emitUserStopTypingEvent()
      } else if (this.ephemeral.textWithLines.length < newValue.length) {
        // if the user is typing and the textarea value is growing, emit CHATROOM_USER_TYPING event.
        this.throttledEmitUserTypingEvent()
      }

      this.ephemeral.textWithLines = newValue
      return true
    },
    updateTextArea () {
      if (!this.$refs.textarea || !this.updateTextWithLines()) {
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
      if (!this.isActive) { // nothing to send
        return false
      }

      let msgToSend = this.$refs.textarea.value || ''

      /*
        Process member/channel mentions in the form:
          member - @username => @userID
          channel - #channel-name => #channelID
      */

      const genMentionRegExp = (type = 'member') => {
        // This regular expression matches all mentions (e.g. @username, #channel-name) that are standing alone between spaces
        const mentionStart = type === 'member' ? CHATROOM_MEMBER_MENTION_SPECIAL_CHAR : CHATROOM_CHANNEL_MENTION_SPECIAL_CHAR
        const availableMentions = type === 'member'
          ? this.activeMembers.map(member => member.username)
          : this.mentionableChatroomsInDetails.map(channel => channel.name)

        return new RegExp(`(?<=\\s|^)${mentionStart}(${availableMentions.join('|')})(?=[^\\w\\d]|$)`, 'g')
      }
      const convertChannelMentionToId = name => {
        const found = this.mentionableChatroomsInDetails.find(entry => entry.name === name)
        return found ? makeChannelMention(found.id, true) : ''
      }
      const convertAllMentions = str => {
        return str.replace(
          genMentionRegExp('member'), // 1. replace all member mentions.
          (_, username) => makeMentionFromUsername(username).me
        ).replace( // 2. replace all channel mentions.
          genMentionRegExp('channel'),
          (_, channelName) => convertChannelMentionToId(channelName)
        )
      }

      const msgSplitByCodeMarkdown = splitStringByMarkdownCode(msgToSend)
      msgSplitByCodeMarkdown.forEach((entry, index) => {
        if (entry.type === 'plain' &&
          // Below check: sometimes, the message content ends without closing the block-code and
          // in this case the rest of the code is treated as code content too.
          msgSplitByCodeMarkdown[index - 1]?.text !== '```'
        ) {
          const mentionConvertedText = convertAllMentions(entry.text)
          entry.text = mentionConvertedText
        }
      })
      msgToSend = combineMarkdownSegmentListIntoString(msgSplitByCodeMarkdown)

      this.$emit(
        'send',
        msgToSend,
        this.hasAttachments
          ? cloneDeep(this.ephemeral.attachments)
          : null,
        this.replyingMessage
      ) // TODO remove first / last empty lines
      this.$refs.textarea.value = ''
      this.updateTextArea()
      this.endMention()
      if (this.hasAttachments) { this.clearAllAttachments() }
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
    fileAttachmentHandler (filesList) {
      filesList = Array.from(filesList)

      // User clicked 'Cancel button'.
      if (!filesList.length) { return }

      const list = this.hasAttachments ? [...this.ephemeral.attachments] : []

      for (const file of filesList) {
        const fileSize = file.size

        if (fileSize > CHAT_ATTACHMENT_SIZE_LIMIT) {
          return sbp('okTurtles.events/emit', OPEN_MODAL, 'ChatFileAttachmentWarningModal')
        }

        const fileUrl = URL.createObjectURL(file)
        const attachment = {
          url: fileUrl,
          name: file.name,
          mimeType: file.type || '',
          size: fileSize,
          downloadData: null // NOTE: we can tell if the attachment has been uploaded by seeing if this field is non-null.
        }

        if (getFileType(file.type) === 'image') {
          const img = new Image()
          img.onload = function () {
            const { width, height } = this
            attachment.dimension = { width, height }
          }
          img.src = fileUrl

          // Determine if the image needs lossy-compression before upload.
          attachment.needsImageCompression = fileSize > IMAGE_ATTACHMENT_MAX_SIZE &&
            // Skip the compression for GIF images so they don't lose animation.
            file.type !== 'image/gif'
        }

        list.push(attachment)
      }

      // sort the list so that the media types come first in the array. (videos -> images -> non-media files)
      const priority = {
        [CHATROOM_ATTACHMENT_TYPES.VIDEO]: 0,
        [CHATROOM_ATTACHMENT_TYPES.IMAGE]: 1,
        [CHATROOM_ATTACHMENT_TYPES.AUDIO]: 2,
        [CHATROOM_ATTACHMENT_TYPES.NON_MEDIA]: 2
      }
      list.sort((a, b) => priority[getFileType(a.mimeType)] - priority[getFileType(b.mimeType)])

      this.ephemeral.attachments = list
      this.$refs.fileAttachmentInputEl.value = '' // clear the input value
    },
    clearAllAttachments () {
      this.ephemeral.staleObjectURLs.push(this.ephemeral.attachments.map(({ url }) => url))
      this.ephemeral.attachments = []
    },
    removeAttachment (targetUrl) {
      // when a URL is no longer needed, it needs to be released from the memory.
      // (reference: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static#memory_management)
      const targetIndex = this.ephemeral.attachments.findIndex(entry => targetUrl === entry.url)

      if (targetIndex >= 0) {
        URL.revokeObjectURL(targetUrl)
        this.ephemeral.attachments.splice(targetIndex, 1)
      }
    },
    selectEmoticon (emoticon) {
      // Making sure the emoticon is added to the cursor position
      const inputEl = this.$refs.textarea
      const valuePrev = inputEl.value.slice(0, inputEl.selectionStart) || ''
      const valueAfter = inputEl.value.slice(inputEl.selectionEnd) || ''
      inputEl.value = valuePrev + emoticon.native + valueAfter

      this.closeEmoticon()
      this.updateTextWithLines()
    },
    startMention (keyword, position, mentionType = 'member') {
      const checkIfContainsKeyword = str => {
        if (typeof str !== 'string') { return false }

        const normalKeyword = keyword.normalize().toUpperCase()
        return str.normalize().toUpperCase().includes(normalKeyword)
      }

      switch (mentionType) {
        case 'member': {
          const all = makeMentionFromUsername('').all
          const availableMentions = Array.from(this.activeMembers)
          // NOTE: '@all' mention should only be needed when the members are more than 3
          if (availableMentions.length > 2) {
            availableMentions.push({
              memberID: all,
              displayName: all.slice(1),
              picture: '/assets/images/horn.png'
            })
          }

          this.ephemeral.mention.options = availableMentions.filter(
            user => checkIfContainsKeyword(user.username) || checkIfContainsKeyword(user.displayName)
          )

          break
        }
        case 'channel': {
          this.ephemeral.mention.options = this.mentionableChatroomsInDetails.filter(channel => checkIfContainsKeyword(channel.name))
        }
      }

      this.ephemeral.mention.type = mentionType
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
    transformTextSelectionToMarkdown (type) {
      // NOTE: should call preventDefault() for 'mousedown' event
      //       to prevents the button from being focused upon click

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
            break
          }
          case 'link': {
            result = injectOrStripLink(inputValue, selStart, selEnd)
          }
        }

        inputEl.value = result.output
        this.$refs.textarea.setSelectionRange(result.focusIndex.start, result.focusIndex.end)
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
        contractID: this.currentChatRoomId,
        innerSigningContractID: this.ourIdentityContractId
      }).catch(e => {
        console.error('Error emitting user typing event', e)
      })
    },
    cancelEditing () {
      this.emitUserStopTypingEvent()
      this.$emit('cancelEdit')
    },
    emitUserStopTypingEvent () {
      sbp('gi.actions/chatroom/user-stop-typing-event', {
        contractID: this.currentChatRoomId,
        innerSigningContractID: this.ourIdentityContractId
      }).catch(e => {
        console.error('Error emitting user stopped typing event', e)
      })
    },
    swapMentionIDForDisplayname
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
  min-width: 0;

  &-textarea,
  &-mask {
    display: block;
    width: 100%;
    font-size: 1rem;
    word-wrap: break-word;
    max-height: 12.75rem;
  }

  &-textarea {
    resize: none;
    overflow: hidden;
    height: 2.75rem;
    min-height: 2.75rem;
    background-color: transparent;
    border: none;
    padding: 0.5rem;
    overflow-y: auto;

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
    overflow-y: hidden;
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

.c-reply-wrapper {
  display: table;
  table-layout: fixed;
  width: 100%;
  position: absolute;
  top: -2.1rem;
}

.c-reply {
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
  top: 0;
  transform: translateY(-100%);
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 12.25rem;

  .c-mention-user,
  .c-mention-channel {
    display: flex;
    align-items: center;
    padding: 0.2rem 0.4rem;
    cursor: pointer;

    &.is-selected {
      background-color: $primary_2;
    }
  }

  .c-username,
  .c-display-name,
  .c-channel-name {
    margin-left: 0.3rem;
  }

  .c-display-name {
    color: $text_1;
  }

  .c-channel-icon {
    font-size: 0.875em;
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
  padding: 0;
  min-height: 0;

  &.isActive:not(:disabled) {
    background: $primary_0;

    &:hover {
      color: $general_1;
      cursor: pointer;
    }
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

@media (hover: none) and (pointer: coarse) {
  // fix for some mobile-specific issue: https://github.com/okTurtles/group-income/issues/1934
  .c-send-textarea {
    padding-bottom: 1rem;
    height: 3.25rem;
  }

  .c-send-actions {
    button.is-icon:focus,
    button.is-icon:hover:not(:disabled) {
      color: $general_0 !important;
    }
  }
}
</style>
