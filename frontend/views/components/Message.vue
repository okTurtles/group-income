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
    border-bottom: 1px solid $text-light;

    &:hover,
    &:focus {
      border-color: transparent;
    }
    &::after {
      background-color: $text-light;
    }
  }

  i {
    font-size: 1.389rem;
    padding-right: $spacer-lg;
  }
  &.is-info {
    background-color: #e0f4fc;
    i {
      color: $info;
    }
  }
  &.is-danger {
    background-color: #ffe2df;
    i {
      color: $danger;
    }
  }
  &.is-warning {
    background-color: #fef4e6;
    i {
      color: $warning;
    }
  }
}

.message-header {
  color: $text-light;
  display: flex;
  padding-bottom: 0, 25rem;
  position: relative;
}
</style>
