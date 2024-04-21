<template lang='pug'>
li.card.c-dm-list-item
  avatar-user.c-dm-avatar(
    :contractID='data.avatar'
    size='md'
  )

  .c-dm-preview
    .c-name-and-sent-date
      .c-name.has-text-bold.has-ellipsis {{ data.name }}
      .c-send-at.has-text-1 {{ displayDate(data.sentAt) }}
    .c-dm-content.has-ellipsis {{ dmContent }}
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import { humanDate, DAYS_MILLIS } from '@model/contracts/shared/time.js'

export default ({
  name: 'DirectMessageListItem',
  components: {
    AvatarUser
  },
  props: {
    data: Object
  },
  computed: {
    dmContent () {
      const msg = this.data.message
      return this.data.isYou ? `You: ${msg}`: msg
    }
  },
  methods: {
    displayDate (d) {
      d = new Date(d)
      const now = new Date()
      const isToday = (now.getTime() - d.getTime()) < DAYS_MILLIS &&
        now.getDate() === d.getDate()

      return isToday
        ? humanDate(d, { hour: 'numeric', minute: 'numeric' }, true)
        : humanDate(d, { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-dm-list-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  column-gap: 0.75rem;
  padding: 1rem;
}

.c-dm-avatar {
  flex-shrink: 0;
}

.c-dm-preview {
  position: relative;
  flex-grow: 1;
  max-width: calc(100% - 3.25rem); // 3.25rem: 0.75 gap + 2.5rem of the avatar.
}

.c-name-and-sent-date {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .c-name {
    flex-grow: 1;
  }

  .c-send-at {
    display: inline-block;
    margin-left: 0.75rem;
    flex-shrink: 0;
  }
}

.c-dm-content {
  position: relative;
  width: 100%;
}
</style>
