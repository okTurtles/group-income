<template>
  <div class="c-message is-flex" :class="[variant, isSameSender && 'sameSender']">
    <avatar :src="avatar"
      hasMargin
      size="sm"
      class="c-avatar level-left"
      aria-hidden="true"
    />
    <div class="c-body">
      <span class="has-text-grey is-size-7 c-who" :class="{ 'sr-only': hideWho || isSameSender }">
        {{who}}
      </span>
      <!-- NOTE: Use v-html to have messages with multiple lines -->
      <p class="c-text" v-html="text" />
    </div>
    <button class="button is-icon has-text-danger" v-if="variant === 'failed'" @click="$emit('retry')">
      <i class="fa fa-undo"></i>
    </button>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  margin: $gi-spacer $gi-spacer-sm 0;
  align-items: flex-end;

  &.sent,
  &.failed {
    margin-left: $gi-spacer-xl;
    flex-direction: row-reverse;
    text-align: right;
  }

  &.sameSender {
    margin-top: $gi-spacer-xs;
  }

  .button {
    flex-shrink: 0;
  }

  @include phablet {
    margin: $gi-spacer $gi-spacer 0;
  }
}

.c-avatar {
  .sent &,
  .failed & {
    margin: 0 0 0.2rem $gi-spacer-sm; // 0.2 to visually align with buble text
  }

  .isHidden &,
  .sameSender & {
    visibility: hidden;
    height: 0;
  }
}

.c-body {
  max-width: 100%;
}

.c-who {
  display: block;

  .sent &,
  .failed & {
    margin-right: $gi-spacer-xs;
  }
}

.c-text {
  max-width: 32rem;
  word-wrap: break-word;

  .sent & {
    background-color: $primary-text;
    color: $body-background-color;
    border: 1px solid;
    border-radius: $radius-large;
    padding: $gi-spacer-xs $gi-spacer-sm;
  }

  .failed & {
    color: $text-light; // REVIEW/OPTIMIZE Verify why $text-light is ligther than $text (correct) and .has-text-light is white (incorrect)... Bulma bug?
    border: 1px dashed $danger;
    border-radius: $radius-large;
    padding: $gi-spacer-xs $gi-spacer-sm;
  }

  // When .c-shot is the only element (when .c-who isn't rendered)
  &:first-child:last-child {
    padding-bottom: $gi-spacer-sm;
  }
}
</style>
<script>
import Avatar from '../Avatar.vue'

export default {
  name: 'Message',
  components: {
    Avatar
  },
  props: {
    text: String,
    who: String,
    avatar: String,
    variant: {
      type: String,
      validator (value) {
        return ['sent', 'received', 'failed'].indexOf(value) !== -1
      }
    },
    isSameSender: Boolean,
    hideWho: Boolean
  }
}
</script>
