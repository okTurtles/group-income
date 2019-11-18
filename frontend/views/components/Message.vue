<template lang='pug'>
.message(:class='`is-${severity}`')
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
@import "@assets/style/_variables.scss";

.message {
  padding: $spacer;
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
    font-weight: 400;
    border-bottom-color: $text_0;

    &:hover,
    &:focus {
      color: $text_1;
      border-bottom-color: $text_1;
    }
  }

  i:not(.icon-times) {
    font-size: $size-3;
    line-height: 1.3125;
    padding-right: $spacer-md;
  }

  &.is-info {
    background-color: var(--primary_2);
    i {
      color: $primary_1;
    }
  }
  &.is-danger {
    background-color: var(--danger_2);
    i {
      color: $danger_1;
    }
  }
  &.is-warning {
    background-color: var(--warning_2);
    i {
      color: $warning_1;
    }
  }
}

.media-content {
  flex-grow: 1;
}

.media-header {
  color: $text_1;
  display: flex;
  padding-bottom: 0, 25rem;
  position: relative;
}
</style>
