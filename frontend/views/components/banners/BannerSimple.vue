<template lang='pug'>
.c-message(:class='`is-${severity}`')
  i(:class='getIcon')

  .c-content
    .c-header
      slot(name='header')

    .c-body
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
    return ['success', 'info', 'warning', 'danger'].indexOf(value) !== -1
  },
  computed: {
    getIcon () {
      return {
        warning: 'icon-exclamation-triangle c-icon',
        danger: 'icon-times-circle c-icon',
        info: 'icon-info-circle c-icon',
        success: 'icon-check-circle c-icon'
      }[this.severity]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-message {
  padding: 1rem;
  border-radius: $radius-large;
  display: flex;
  align-items: flex-start;

  strong {
    color: currentColor;
  }

  ::v-deep a.link {
    font-weight: 400;
    color: currentColor;
    border-bottom-color: currentColor;

    &:hover,
    &:focus {
      color: $text_0;
      border-bottom-color: $text_0;
    }
  }

  &.is-info {
    background-color: $primary_2;
    color: $primary_0;

    .c-icon {
      color: $primary_1;
    }
  }

  &.is-danger {
    background-color: $danger_2;
    color: $danger_0;

    .c-icon {
      color: $danger_1;
    }
  }

  &.is-warning {
    background-color: $warning_2;
    color: $warning_0;

    .c-icon {
      color: $warning_1;
    }
  }

  &.is-success {
    background-color: $success_2;
    color: $success_0;

    .c-icon {
      color: $success_1;
    }
  }
}

.c-icon {
  font-size: $size_3;
  margin-right: 1rem;
}

.c-content {
  margin-top: 0.125rem; // visually better, with 1 or multiple lines
  flex-grow: 1;
}

.c-header {
  display: block;
  color: $text_0;
}
</style>
