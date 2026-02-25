<template lang='pug'>
.card.c-dm-list-item
  .c-dm-info
    .c-dm-title
      span {{ dmDetails.title }}
      i18n.c-you(v-if='dmDetails.isDMToMyself') (you)
    i18n.c-no-message No messages yet
</template>

<script>
export default {
  name: 'DirectMessageListItem',
  props: {
    dmDetails: {
      type: Object,
      required: true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-dm-list-item {
  padding: 1.25rem 1.75rem;

  &:last-child {
    margin-bottom: 0;
  }
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
</style>
