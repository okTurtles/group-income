<template lang="pug">
li.c-item(:class="{ 'has-divider': hasDivider }")
  component.c-item-link.is-unstyled(
    :is='tag'
    :class='itemLinkClasses'
    :active-class="tag === 'router-link' && 'is-active'" v-bind='$attrs' v-on='$listeners'
  )
    i(
      v-if='icon'
      :class='{ [`icon-${icon}`]: icon }'
    )
    span.c-item-slot
      slot
    badge(:number='badgeCount')
</template>

<script>
import Badge from './Badge.vue'

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
        [this.variant]: this.variant,
        'no-radius': this.disableRadius,
        'is-active': this.isActive
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-item {

  &.has-divider {
    margin-bottom: $spacer-sm;
    padding-bottom: $spacer-sm;
    border-bottom: 1px solid $border;
  }

  &-slot {
    display: flex;
    align-items: center;
    flex-grow: 1;
  }
}

.c-item-link {
  display: flex;
  align-items: center;
  padding: 0 $spacer;
  height: $spacer-lg;
  cursor: pointer;
  transition: background-color ease-out 0.3s;

  i {
    margin-right: $spacer;
    font-size: 0.77rem;
    color: $text-light;
    transition: transform cubic-bezier(0.18, 0.89, 0.32, 1.28) 0.3s, color ease-in 0.3s;
  }

  &:hover,
  &:focus {
    transition: none;
    background-color: $primary-bg-a;

    &.solid {
      background-color: $light;
    }

    .i {
      color: inherit;
      transform: scale(1.1);
    }
  }

  &.no-radius {
    border-radius: 0;
  }

  &.secondary {
    color: $text-light;
    letter-spacing: -0.01rem;

    &:hover,
    &:focus {
      background-color: $primary-bg-a;
    }
  }

  &.is-active {
    font-weight: 600;

    i {
      color: var(--primary-saturated);
    }

    &:hover,
    &:focus {
      background-color: $primary-bg-a;
    }
  }
}
</style>
