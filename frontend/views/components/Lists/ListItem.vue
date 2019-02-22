<template>
  <li class="c-item" :class="{ 'has-divider': hasDivider }">
    <component :is="tag"
      class="no-border"
      :class="itemLinkClasses"
      :active-class="tag === 'router-link' && 'is-active'"
      v-bind="$attrs" v-on="$listeners"
    >
      <i class="fa" :class="{ [`fa-${icon}`]: icon }" v-if="icon"></i>
      <span class="c-item-slot"><slot></slot></span>
      <badge :number="badgeCount" />
    </component>
  </li>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-item {
  padding: 0 $gi-spacer-sm;

  &.has-divider {
    margin-bottom: $gi-spacer-sm;
    padding-bottom: $gi-spacer-sm;
    border-bottom: 1px solid $grey-lighter;
  }

  &-slot {
    display: flex;
    align-items: center;
    flex-grow: 1;
  }
}

.c-item-link {
  display: flex;
  width: 100%;
  padding: 0.375rem $gi-spacer-sm 0.3125rem $gi-spacer-sm;
  color: $text;
  cursor: pointer;
  border-radius: $radius;
  transition: background-color ease-out .3s;

  .fa {
    transition: transform cubic-bezier(0.18, 0.89, 0.32, 1.28) .3s;
  }

  &:hover,
  &:focus {
    transition: none;
    background-color: $primary-bg-a;

    &.solid {
      background-color: $light;
    }

    .fa {
      color: inherit;
      transform: scale(1.1)
    }
  }

  &.no-radius {
    border-radius: 0;
  }

  &.secondary {
    color: $grey;
    padding: $gi-spacer-xs $gi-spacer-sm;
    letter-spacing: -0.01rem;

    &:hover,
    &:focus {
      background-color: transparent;
      color: $text;
    }
  }

  .fa {
    color: $grey;
    margin-right: $gi-spacer;
    font-size: 0.77rem;
  }

  &.is-active {
    font-weight: 600;

    .fa {
      color: $primary;
    }
  }

  &.is-active {
    &:hover,
    &:focus {
      background-color: $primary-bg-a;
    }

    .fa {
      color: $primary;
    }
  }
}
</style>
<script>
import Badge from '../Badge.vue'

export default {
  name: 'ListItem',
  components: {
    Badge
  },
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
        return ['router-link', 'a', 'button', 'div'].indexOf(value) > -1
      },
      default: 'div',
      required: true
    },
    variant: {
      validator (value) {
        return ['secondary', 'solid'].indexOf(value) > -1
      }
    }
  },
  inheritAttrs: false,
  computed: {
    itemLinkClasses () {
      return {
        'c-item-link level is-flex gi-is-justify-between gi-is-unstyled': true,
        [this.variant]: this.variant,
        'no-radius': this.disableRadius,
        'is-active': this.isActive
      }
    }
  }
}
</script>
