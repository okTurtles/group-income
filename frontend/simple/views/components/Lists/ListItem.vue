<template>
  <li class="c-item" :class="{ 'has-divider': hasDivider }">
    <component :is="tag"
      :class="itemLinkClasses"
      :active-class="tag === 'router-link' && 'is-active'"
      v-bind="$attrs" v-on="$listeners"
    >
      <i class="fa" :class="{ [`fa-${icon}`]: icon }" v-if="icon"></i>
      <span class="c-item-text"><slot></slot></span>
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
}

.c-item-link {
  padding: $gi-spacer-sm;
  color: $text;
  cursor: pointer;
  border-radius: $radius;

  &.no-radius {
    border-radius: 0;
  }

  &.secondary {
    color: $grey;
  }

  .fa {
    color: $grey;
    margin-right: $gi-spacer;
  }

  &:hover,
  &:focus {
    background-color: $primary-bg-a;

    .fa {
      color: inherit;
    }
  }

  &.is-active {
    font-weight: 600;

    .fa {
      color: $primary;
    }
  }
}

.c-item-text {
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
        return ['router-link', 'a', 'button', 'div'].indexOf(value) > -1
      },
      default: 'div',
      required: true
    },
    variant: {
      validator (value) {
        return ['secondary'].indexOf(value) > -1
      }
    }
  },
  inheritAttrs: false,
  computed: {
    itemLinkClasses () {
      return {
        'c-item-link level is-flex gi-is-justify-between gi-is-unstyled': true,
        'secondary': this.variant === 'secondary',
        'no-radius': this.disableRadius,
        'is-active': this.isActive
      }
    }
  }
}
</script>
