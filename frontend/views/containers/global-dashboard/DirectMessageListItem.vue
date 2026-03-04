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
    .c-dm-title.has-ellipsis
      span.is-title-4 {{ dmDetails.title }}
      i18n.c-you(v-if='dmDetails.isDMToMyself') (you)

    .c-dm-message-preview(
      v-if='dmDetails.previewMessage'
      :class='{ "is-italic": dmDetails.previewMessage.previewType === "info" }'
    )
      span.c-dm-preview-from(v-if='fromDisplay') {{ fromDisplay }}:
      span.c-dm-preview-text {{ dmDetails.previewMessage.text }}
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
      return this.dmDetails.isDMToMyself
        ? this.ourIdentityContractId
        : this.dmDetails.partners?.[0]?.contractID || this.ourIdentityContractId
    },
    timestamp () {
      const t = this.dmDetails.lastMsgTimeStamp || this.dmDetails.createdTimeStamp
      return humanTimeString(t)
    },
    fromDisplay () {
      return this.dmDetails.previewMessage
        ? this.dmDetails.isDMToMyself
          ? L('You')
          : this.getSenderDisplayName(this.dmDetails.previewMessage.from)
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
    border: 1px solid $primary_0;
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
  position: relative;
  flex-grow: 1;
  min-width: 0;
}

.c-dm-title {
  font-weight: 600;
  color: $text_0;
  width: 100%;
}

.c-dm-message-preview {
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
  flex-shrink: 0;
  font-size: $size_5;

  @include tablet {
    font-size: $size-4;
  }
}

.c-dm-preview-from {
  display: inline-block;
  margin-right: 0.25rem;
}

.c-dm-preview-text {
  word-break: break-all;
}

// has-new styles
.card.c-dm-list-item.has-new {
  border-color: $text_1;

  &:focus,
  &:focus-within,
  &:hover {
    border-color: $primary_0;
  }

  .c-dm-message-preview {
    color: $text_0;
  }
}
</style>
