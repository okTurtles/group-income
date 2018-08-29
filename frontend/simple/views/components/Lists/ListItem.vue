<template>
  <li class="c-item" :class="itemClasses">
    <component :is="tag"
      :class="contentClasses"
      :active-class="tag === 'router-link' && 'is-active'"
      v-bind="$attrs" v-on="$listeners"
    >
      <i class="fa c-item-icon" :class="{ [`fa-${icon}`]: icon }" v-if="icon"></i>
      <span class="c-item-slot"><slot></slot></span>
      <slot name="actions"></slot>
      <span class="c-item-badge" v-if="badgeCount">{{badgeCount}}</span>
    </component>
  </li>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-item {
  &.has-divider {
    margin-bottom: $gi-spacer-sm;
    padding-bottom: $gi-spacer-sm;
    border-bottom: 1px solid $grey-lighter;
  }

  &.has-margin {
    margin: $gi-spacer-sm 0;
  }
}

.c-item-icon {
  color: $grey;
  margin-right: $gi-spacer;
}

.c-item-content {
  width: 100%;
  padding: $gi-spacer-sm;
  color: $text;
  border-radius: $radius;

  &.no-radius {
    border-radius: 0;
  }

  &.secondary {
    color: $grey;
  }

  &.solid,
  &.unfilled {
    padding: $gi-spacer * 0.75 $gi-spacer;
  }

  &.solid {
    background-color: $white-ter;

    &.has-interaction {
      background-color: $primary-bg-s;
    }
  }

  &.unfilled {
    border: 1px dashed $primary;

    .c-item-icon {
      color: $primary;
    }
  }

  &.has-actions {
    background-color: $primary-bg-a;
    // To makeup for action square buttons height
    padding: $gi-spacer-sm $gi-spacer-sm $gi-spacer-sm $gi-spacer;
  }

  &.is-active {
    font-weight: 600;

    .c-item-icon {
      color: $primary;
    }
  }

  &.has-interaction {
    cursor: pointer;

    &:hover,
    &:focus {
      background-color: $primary-bg-a;

      .c-item-icon {
        color: inherit;
      }
    }
  }
}

.c-item-slot {
  flex-grow: 1;
}

.c-item-badge {
  display: inline-block;
  padding: 1px 5px; // a rounded square
  color: $body-background-color;
  line-height: 1.1;
  border-radius: $radius;
  background-color: $danger;
}
</style>
<script>
export default {
  name: 'ListItem',
  props: {
    itemId: String,
    icon: String,
    badgeCount: Number,
    /** When true a 1px border is added to the bottom of the list item. */
    hasDivider: Boolean,
    disableRadius: Boolean,
    isActive: Boolean,
    tag: {
      validator (value) {
        return ['router-link', 'a', 'button', 'div'].includes(value)
      },
      default: 'div',
      required: false
    },
    variant: {
      validator (value) {
        return ['secondary', 'solid', 'unfilled'].includes(value)
      },
      required: false
    }
  },
  inheritAttrs: false,
  computed: {
    itemClasses () {
      return {
        'has-divider': this.hasDivider,
        'has-margin': this.variant === 'solid' || this.variant === 'unfilled'
      }
    },
    contentClasses () {
      return {
        'c-item-content level is-flex gi-is-justify-between gi-is-unstyled': true,
        'secondary': this.variant === 'secondary',
        'solid': this.variant === 'solid',
        'unfilled': this.variant === 'unfilled',
        'no-radius': this.disableRadius,
        'has-interaction': ['router-link', 'a', 'button'].includes(this.tag),
        'is-active': this.isActive,
        'has-actions': !!this.$slots.actions
      }
    }
  }
}
</script>
