<template>
  <div class="c-message" :class="variant">
    <avatar :src="avatar" hasMargin v-if="variant === 'received'" />
    <span class="c-who has-text-grey" v-if="hasWho">{{who}}</span>
    <p class="c-slot">
      <slot></slot>
    </p>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  margin: $gi-spacer;

  &.sent {
    text-align: right;
  }
}

.c-slot {
  padding: $gi-spacer-xs 0;
  display: inline-block;

  .sent & {
    background-color: $primary;
    color: $body-background-color;
    border-radius: $radius-large;
    padding-right: $gi-spacer-sm;
    padding-left: $gi-spacer-sm;
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
    hasWho: Boolean,
    who: String,
    avatar: String,
    variant: {
      type: String,
      validator (value) {
        return ['sent', 'received', 'failed'].indexOf(value) !== -1
      }
    }
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
