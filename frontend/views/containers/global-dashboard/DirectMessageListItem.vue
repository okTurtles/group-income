<template lang='pug'>
.card.c-dm-list-item(
  role='button'
  tabindex='0'
  @click.stop='onTileClick'
)
  .c-dm-avatar
    avatar-user(
      :contractID='avatarContractID'
      :picture='dmDetails.picture'
      size='md'
    )

  .c-dm-info
    .c-dm-title
      span.is-title-4 {{ dmDetails.title }}
      i18n.c-you(v-if='dmDetails.isDMToMyself') (you)
    i18n.c-no-message No messages yet

  .c-dm-timestamp.has-text-color-1 {{ timestamp }}
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import { humanTimeString } from '@model/contracts/shared/time.js'

export default {
  name: 'DirectMessageListItem',
  components: {
    AvatarUser,
    ProfileCard
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
    }
  },
  methods: {
    onTileClick () {
      alert('TODO: open the DM conversation interface in Global Dashboard.')
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
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0);
  transition: border-color 120ms ease-out;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover,
  &:focus,
  &:focus-within {
    border: 1px solid $general_0;

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
  flex-shrink: 0;
}

.c-dm-info {
  flex-grow: 1;
}

.c-dm-title {
  font-weight: 600;
  color: $text_0;
}

.c-no-message {
  font-size: 0.875rem;
  color: $text_1;
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
</style>
