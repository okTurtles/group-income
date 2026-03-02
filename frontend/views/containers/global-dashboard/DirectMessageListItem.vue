<template lang='pug'>
.card.c-dm-list-item(
  :class='{ "has-new": dmDetails.hasNew }'
  @click.stop='onTileClick'
  @keyup.enter='onTileClick'
  role='button'
  tabindex='0'
)
  .c-dm-avatar
    avatar-user(
      :contractID='avatarContractID'
      :picture='dmDetails.picture'
      size='md'
    )
    badge.c-badge(v-if='dmDetails.hasNew' type='compact')

  .c-dm-info
    .c-dm-title
      span.is-title-4 {{ dmDetails.title }}
      i18n.c-you(v-if='dmDetails.isDMToMyself') (you)

    .c-dm-latest-message(
      v-if='dmDetails.latestMessage'
      :class='{ "is-italic": shouldStyleItalic(dmDetails.latestMessage) }'
    )
      span.c-dm-preview-from(v-if='fromDisplay') {{ fromDisplay }}:
      span.c-dm-preview-text {{ getPreviewText(dmDetails.latestMessage) }}
    i18n.c-no-message(v-else) No messages yet

  .c-dm-timestamp.has-text-1 {{ timestamp }}
</template>

<script>
import { mapGetters } from 'vuex'
import { L } from '@common/common.js'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import Badge from '@components/Badge.vue'
import { humanTimeString } from '@model/contracts/shared/time.js'
import { stripMarkdownSyntax } from '@view-utils/markdown-utils.js'
import { MESSAGE_TYPES } from '@model/contracts/shared/constants.js'

export default {
  name: 'DirectMessageListItem',
  components: {
    AvatarUser,
    ProfileCard,
    Badge
  },
  props: {
    dmDetails: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'ourIdentityContractId'
    ]),
    avatarContractID () {
      return this.dmDetails.isDMToMyself ? this.ourIdentityContractId : this.dmDetails.partners[0].contractID
    },
    timestamp () {
      const t = this.dmDetails.lastMsgTimeStamp || this.dmDetails.createdTimeStamp
      return humanTimeString(t)
    },
    fromDisplay () {
      return this.dmDetails.latestMessage
        ? this.dmDetails.isDMToMyself
          ? L('You')
          : this.getSenderDisplayName(this.dmDetails.latestMessage.from)
        : null
    }
  },
  methods: {
    onTileClick () {
      this.$router.push({
        name: 'GlobalDirectMessagesConversation',
        params: { chatRoomID: this.dmDetails.chatRoomID }
      })
    },
    getSenderDisplayName (contractID) {
      return contractID === this.ourIdentityContractId
        ? L('You')
        : this.dmDetails.partners.find(partner => partner.contractID === contractID)?.displayName || L('Unknown')
    },
    shouldStyleItalic (message) {
      return message.type !== MESSAGE_TYPES.TEXT
    },
    getPreviewText (message) {
      switch (message.type) {
        case MESSAGE_TYPES.TEXT:
          return stripMarkdownSyntax(message.text)
        case MESSAGE_TYPES.POLL: {
          const pollTitle = message.pollData.question
          return L('Created a poll: "{pollTitle}"', { pollTitle })
        }
        default:
          return L('Sent a new message')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card.c-dm-list-item {
  position: relative;
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: flex-start;
  column-gap: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0);
  transition: border-color 120ms ease-out;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  &:focus,
  &:focus-within,
  &:hover {
    border: 1px solid $text_1;
    outline: none;
    appearance: none;

    .c-dm-title,
    .c-you {
      text-decoration: underline;
    }
  }

  @include tablet {
    column-gap: 0.75rem;
    padding: 1.25rem 1.75rem;
    margin-bottom: 1.25rem;
  }
}

.c-dm-avatar {
  position: relative;
  flex-shrink: 0;

  .c-badge.is-compact {
    min-width: 0.75rem;
    height: 0.75rem;
    top: -1px;
    right: -1px;
  }
}

.c-dm-info {
  flex-grow: 1;
}

.c-dm-title {
  font-weight: 600;
  color: $text_0;
}

.c-dm-latest-message {
  color: $text_1;

  &.is-italic {
    font-style: italic;
  }
}

.c-no-message {
  font-size: 0.875rem;
  color: $text_1;
  font-style: italic;
}

.c-you {
  display: inline-block;
  margin-left: 0.25rem;
}

.c-dm-timestamp {
  font-size: $size_5;

  @include tablet {
    font-size: $size-4;
  }
}

.c-dm-preview-from {
  display: inline-block;
  margin-right: 0.25rem;
}

// has-new styles
.card.c-dm-list-item.has-new {
  border-color: $general_0;

  &:focus,
  &:focus-within,
  &:hover {
    border-color: $text_1;
  }

  .c-dm-latest-message {
    color: $text_0;
  }
}
</style>
