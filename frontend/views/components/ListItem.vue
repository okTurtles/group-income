<template lang="pug">
li.c-item
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
    isActive: Boolean,
    tag: {
      validator (value) {
        return ['router-link', 'a', 'button', 'div'].indexOf(value) > -1
      },
      default: 'div',
      required: true
    }
  },
  inheritAttrs: false,
  computed: {
    itemLinkClasses () {
      return {
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
    border-bottom: 1px solid $general_0;
  }

  &-slot {
    display: flex;
    align-items: center;
    flex-grow: 1;
  }
}

.c-item-link {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 $spacer;
  height: 3rem;
  transition: background-color ease-out 0.3s;
  color: $text_0;
  font-family: "Poppins";
  text-align: center;
  font-weight: 100;
  cursor: pointer;

  i {
    width: $spacer;
    margin-right: $spacer;
    font-size: 1rem;
    color: $text_1;
    transition: transform cubic-bezier(0.18, 0.89, 0.32, 1.28) 0.3s, color ease-in 0.3s;
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    width: 2px;
    height: 0%;
    background-color: $text_0;
    transition: height 0.3s ease-out, 0.3s background-color ease-out 0.3s;
  }

  &:hover,
  &:focus {
    background-color: $general_1;

    &::before {
      background-color: $general_0;
      transition: height 0.3s ease-out, 0s background-color;
    }
  }

  &.is-active,
  &:hover,
  &:focus {
    i {
      color: $text_0;
    }

    &::before {
      height: 100%;
    }
  }

  &.is-active {
    font-weight: 600;

    &:hover::before {
      background-color: $text_0;
    }
  }

  &.no-radius {
    border-radius: 0;
  }
}
</style>
