<template lang='pug'>
li.c-item
  component.c-item-link.is-unstyled(
    :is='tag'
    :class='itemLinkClasses'
    :active-class='tag === "router-link" && "is-active"'
    v-bind='$attrs'
    v-on='$listeners'
  )
    i(
      v-if='icon'
      :class='{ [`icon-${icon}`]: icon }'
    )
      badge(v-if='badgeCount' type='compact') {{ badgeCount }}
    span.c-item-slot
      slot
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
      required: false
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
@import "@assets/style/_variables.scss";

.c-item {
  &.has-divider {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
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
  padding: 0 1rem;
  height: 3rem;
  transition: background-color ease-out 0.3s;
  color: $text_0;
  font-family: "Poppins";
  text-align: center;
  cursor: pointer;

  i {
    position: relative;
    width: 1.5rem;
    height: 1.5rem;
    margin-right: 1rem;
    font-size: 1rem;
    color: $text_1;
    transform: translateY(0.125rem); // visually vertical aligned
    transition: color ease-in 0.3s;
  }

  &::before {
    content: "";
    position: absolute;
    left: 0;
    width: 2px;
    height: 0%;
    background-color: $text_0;
    transition: height 0.3s ease-out, 0.3s background-color ease-out 0.3s;
  }

  &.is-active,
  &:hover,
  &:focus {
    i {
      color: $text_0;
    }

    &::before {
      height: 100%;
      transition: height 0.3s ease-out, 0s background-color;
    }
  }

  &:hover {
    background-color: $general_1;

    &::before {
      background-color: $general_0;
    }
  }

  &.is-active {
    font-weight: 600;

    &:focus::before,
    &:hover::before {
      background-color: $text_0;
    }
  }

  &.no-radius {
    border-radius: 0;
  }
}
</style>
