<template lang='pug'>
.c-message(
  :class='[variant, isSameSender && "same-sender", "is-type-" + type]'
  @click='$emit("wrapperAction")'
  v-touch:touchhold='openMenu'
  v-touch:swipe.left='reply'
)
  .c-message-wrapper
    slot(name='image')
      avatar.c-avatar(:src='avatar' aria-hidden='true' size='md')

    .c-body
      slot(name='header')
        .c-who(
          v-if='!isEditing'
          :class='{ "sr-only": isSameSender }'
        )
          span.is-title-4 {{ who }}
          span.has-text-1 {{ humanDate(datetime, { hour: 'numeric', minute: 'numeric' }) }}

      slot(name='body')
        p.c-replying(
          if='replyingMessage'
          @click='onReplyMessageClicked'
        )
          template(v-for='(objReplyMessage, index) in replyMessageObjects')
            span.custom-markdown-content(
              v-if='isText(objReplyMessage)'
              v-safe-html:a='objReplyMessage.text'
            )
            span.c-mention(
              v-else-if='isMention(objReplyMessage)'
              :class='{"c-mention-to-me": objReplyMessage.toMe}'
            ) {{ objReplyMessage.text }}
        send-area(
          v-if='isEditing'
          :defaultText='text'
          :isEditing='true'
          @send='onMessageEdited'
          @cancelEdit='cancelEdit'
        )

        p.c-text(v-else-if='text')
          template(v-for='objText in textObjects')
            span.custom-markdown-content(
              v-if='isText(objText)'
              v-safe-html:a='objText.text'
            )
            span.c-mention(
              v-else-if='isMention(objText)'
              :class='{"c-mention-to-me": objText.toMe}'
            ) {{ objText.text }}
          i18n.c-edited(v-if='edited') (edited)

        .c-attachment-container
          template(v-for='attachment in attachments')
            div(
              :class='"c-attachment-" + attachment.attachType'
            )
              img(
                v-if='isImage(attachment)'
                :alt='attachment.name'
                :src='attachment.url'
              )
              template(v-else)
                .c-non-image-icon
                  i.icon-file

                .c-non-image-file-info
                  .c-file-name.has-ellipsis {{ attachment.name }}
                  .c-file-ext {{ attachment.extension.substring(1) }}

              .c-attachment-actions-container
                .c-attachment-actions
                  tooltip(
                    direction='top'
                    :text='L("Download")'
                  )
                    button.is-icon-small(
                      :aria-label='L("Download")'
                      @click='downloadAttachment(attachment)'
                    )
                      i.icon-download
                  tooltip(
                    direction='top'
                    :text='L("Delete")'
                  )
                    button.is-icon-small(
                      :aria-label='L("Delete")'
                      @click='deleteAttachment(attachment)'
                    )
                      i.icon-trash-alt

  .c-full-width-body
    slot(name='full-width-body')

  message-reactions(
    v-if='!isEditing'
    :emoticonsList='emoticonsList'
    :messageType='type'
    :currentUserID='currentUserID'
    @selectEmoticon='selectEmoticon($event)'
    @openEmoticon='openEmoticon($event)'
  )

  message-actions(
    v-if='!isEditing'
    :variant='variant'
    :type='type'
    :isCurrentUser='isCurrentUser'
    ref='messageAction'
    @openEmoticon='openEmoticon($event)'
    @editMessage='editMessage'
    @deleteMessage='deleteMessage'
    @reply='reply'
    @retry='retry'
    @copyMessageLink='copyMessageLink'
  )
</template>

<script>
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Tooltip from '@components/Tooltip.vue'
import emoticonsMixins from './EmoticonsMixins.js'
import MessageActions from './MessageActions.vue'
import MessageReactions from './MessageReactions.vue'
import SendArea from './SendArea.vue'
import { humanDate } from '@model/contracts/shared/time.js'
import { makeMentionFromUserID } from '@model/contracts/shared/functions.js'
import { MESSAGE_TYPES } from '@model/contracts/shared/constants.js'
import { convertToMarkdown } from '@view-utils/convert-to-markdown.js'

const TextObjectType = { Text: 'TEXT', Mention: 'MENTION' }
export default ({
  name: 'MessageBase',
  mixins: [emoticonsMixins],
  components: {
    Avatar,
    Tooltip,
    MessageActions,
    MessageReactions,
    SendArea
  },
  data () {
    return {
      isEditing: false
    }
  },
  props: {
    height: Number,
    text: String,
    attachments: {
      type: Array,
      default: () => []
    },
    messageHash: String,
    replyingMessage: String,
    who: String,
    currentUserID: String,
    avatar: [Object, String],
    datetime: {
      type: Date,
      required: true
    },
    edited: Boolean,
    notification: Object,
    type: String,
    emoticonsList: {
      type: Object,
      default: null
    },
    variant: String,
    isSameSender: Boolean,
    isCurrentUser: Boolean,
    convertTextToMarkdown: Boolean
  },
  computed: {
    ...mapGetters(['ourContactProfilesById', 'usernameFromID']),
    textObjects () {
      return this.generateTextObjectsFromText(this.text)
    },
    replyMessageObjects () {
      return this.generateTextObjectsFromText(this.replyingMessage)
    }
  },
  methods: {
    humanDate,
    editMessage () {
      if (this.type === MESSAGE_TYPES.POLL) {
        alert('TODO: implement editting a poll')
      } else {
        this.isEditing = true
      }
    },
    onReplyMessageClicked () {
      this.$emit('reply-message-clicked')
    },
    onMessageEdited (newMessage) {
      this.isEditing = false
      if (this.text !== newMessage) {
        this.$emit('message-edited', newMessage)
      }
    },
    deleteMessage () {
      this.$emit('delete-message')
    },
    cancelEdit () {
      this.isEditing = false
    },
    reply () {
      this.$emit('reply')
    },
    copyMessageLink () {
      if (!this.messageHash) { return }

      const url = new URL(location.href)
      url.search = `mhash=${this.messageHash}`

      navigator.clipboard.writeText(url.href)
    },
    selectEmoticon (emoticon) {
      this.$emit('add-emoticon', emoticon.native || emoticon)
    },
    retry () {
      this.$emit('retry')
    },
    openMenu () {
      this.$refs.messageAction.$refs.menu.handleTrigger()
    },
    isText (o) {
      return o.type === TextObjectType.Text
    },
    isMention (o) {
      return o.type === TextObjectType.Mention
    },
    isImage (attachment) {
      return attachment.attachType === 'image'
    },
    generateTextObjectsFromText (text) {
      if (!text) {
        return []
      } else if (!text.includes('@')) {
        return [
          {
            type: TextObjectType.Text,
            text: this.convertTextToMarkdown ? convertToMarkdown(text) : text
          }
        ]
      }
      const allMention = makeMentionFromUserID('').all
      const possibleMentions = Object.keys(this.ourContactProfilesById).map(u => makeMentionFromUserID(u).me).filter(v => !!v)

      return text
        // We try to find all the mentions and render them as mentions instead
        // of regular text. The `(?<=\\s|^)` part ensures that a mention is
        // preceded by a space or is the start of a line and the `(?=[^\\w\\d]|$)`
        // ensures that it's followed by an end-of-line or a character that's not
        // a letter or a number (so `Hi @user!` works).
        .split(new RegExp(`(?<=\\s|^)(${allMention}|${possibleMentions.join('|')})(?=[^\\w\\d]|$)`))
        .map(t => {
          if (t === allMention) {
            return { type: TextObjectType.Mention, text: t }
          }
          return possibleMentions.includes(t)
            ? { type: TextObjectType.Mention, text: t[0] + this.usernameFromID(t.slice(1)) }
            : {
                type: TextObjectType.Text,
                text: this.convertTextToMarkdown ? convertToMarkdown(t) : t
              }
        })
    },
    downloadAttachment (attachment) {
      console.log('TODO - Attachment download', attachment)
    },
    deleteAttachment (attachment) {
      console.log('TODO - Attachment delete', attachment)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  padding: 0.5rem 1rem;
  scroll-margin: 20px;

  @include tablet {
    padding: 0.5rem 1.25rem;
  }
  position: relative;
  max-height: 100%;

  &.removed {
    background-color: $danger_2;
    opacity: 0;
    transition: opacity 0.7s ease-in-out 0.3s, background-color 0.3s ease-in;
  }

  &.pending {
    .c-text {
      color: $general_0;
    }
  }

  &.same-sender {
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

    ::v-deep .c-actions {
      display: flex;
    }
  }
}

.c-message-wrapper {
  display: flex;
  align-items: flex-start;
}

.c-avatar {
  .isHidden &,
  .same-sender & {
    visibility: hidden;
    height: 0;
  }
}

.c-body,
.c-full-width-body {
  width: 100%;
}

.c-who {
  display: block;

  span {
    padding-right: 0.25rem;
  }
}

.c-text {
  word-break: break-word; // too much long words will break
  white-space: pre-line; // break \n to a new line
  margin: 0;

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    margin-bottom: 0.5rem;
  }
}

.c-focused {
  animation: focused 1s linear 0.5s;
}

.c-disappeared {
  animation: disappeared 0.5s linear;
}

.c-replying {
  border-left: 2px;
  border-color: #dbdbdb; // var(--text_1);
  border-style: none none none solid;
  font-size: 0.75rem;
  color: var(--text_1);
  font-style: italic;
  padding-left: 0.25rem;

  &:hover {
    cursor: pointer;
    color: var(--text_2);
    border-color: var(--text_1); // var(--text_2);
  }

  .c-mention {
    background-color: transparent;
  }
}

.c-edited {
  margin-left: 0.2rem;
  font-size: 0.7rem;
  color: var(--text_1);
}

.c-mention {
  background-color: $primary_2;
  color: $primary_0;
  padding: 0 0.1rem;
}

.c-mention.c-mention-to-me {
  background-color: $warning_1;
  // background-color: #f2c74466;
}

.c-attachment-container {
  position: relative;
  padding: 0 0.5rem;
  margin-top: 0.75rem;
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.c-attachment-image,
.c-attachment-non-image {
  position: relative;
  border-radius: inherit;
  border: 1px solid $general_0;
  cursor: pointer;
  padding: 0.5rem;
}

.c-attachment-non-image {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "attachment-icon attachment-info";
  align-items: center;
  gap: 0.5rem;
  width: 17.25rem;
  min-height: 3.5rem;

  .c-non-image-icon {
    grid-area: attachment-icon;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.25rem;
    color: $primary_0;
    background-color: $primary_2;
  }

  .c-non-image-file-info {
    grid-area: attachment-info;
    position: relative;
    display: block;
    line-height: 1.2;
    width: calc(100% - 3.5rem);

    .c-file-name {
      position: relative;
      font-weight: bold;
      max-width: 13.25rem;
    }

    .c-file-ext {
      text-transform: uppercase;
    }
  }
}

.c-attachment-actions-container {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0.5rem;
  visibility: hidden;
  display: flex;
  align-items: center;
}

.c-attachment-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  background-color: $background_0;
  padding: 2px;

  .is-icon-small {
    color: $text_1;
    border-radius: 0;

    &:hover {
      background-color: $general_2;
      color: $text_0;
    }
  }
}

.c-attachment-image:hover .c-attachment-actions-container,
.c-attachment-non-image:hover .c-attachment-actions-container {
  visibility: visible;
}
</style>
