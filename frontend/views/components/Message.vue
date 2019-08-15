<template lang="pug">
.message(:class="'is-'+severity")
  .media
    i(:class='getIcon')

  .media-content
    .message-header
      slot(name='header')

    .message-body
      slot
</template>

<script>
export default {
  name: 'Message',
  props: {
    severity: String,
    default () { return 'info' }
  },
  validator: function (value) {
    // The value must match one of these strings
    return ['info', 'warning', 'danger'].indexOf(value) !== -1
  },
  computed: {
    getIcon () {
      return {
        warning: 'icon-exclamation-triangle',
        danger: 'icon-times-circle',
        info: 'icon-info-circle'
      }[this.severity]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.message {
  padding: $spacer-lg 1.5rem $spacer-lg $spacer-lg;
  border-radius: $radius-large;
  letter-spacing: 0.1px;
  display: flex;
  strong {
    color: currentColor;
  }
  a:not(.button):not(.tag) {
    color: currentColor;
  }

  ::v-deep a.link {
    border-bottom: 1px solid $text_1;

    &:hover,
    &:focus {
      border-color: transparent;
    }
    &::after {
      background-color: $text_1;
    }
  }

  i {
    font-size: 1.389rem;
    padding-right: $spacer-lg;
  }
  &.is-info {
    background-color: var(--primary_2);
    i {
      color: $primary_0;
    }
  }
  &.is-danger {
    background-color: var(--danger_2);
    i {
      color: $danger_0;
    }
  }
  &.is-warning {
    background-color: var(--warning_2);
    i {
      color: $warning_0;
    }
  }
}

.message-header {
  color: $text_1;
  display: flex;
  padding-bottom: 0, 25rem;
  position: relative;
}
</style>
