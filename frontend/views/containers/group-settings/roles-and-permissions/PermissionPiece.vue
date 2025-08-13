<template lang='pug'>
component.c-permission-piece(
  :is='this.isSelectable ? "button" : "div"'
  v-bind='dynamicAttrs'
  :class='dynamicClasses'
  @click.stop='onClick'
)
  template(v-if='!isSelectable')
    i.icon-check-circle
    span.c-permission-piece-text {{ getPermissionDisplayName(permission) }}

  template(v-else)
    .checkbox
      input.input.c-permission-checkbox(
        type='checkbox'
        :name='"select-" + permission'
        :checked='active'
      )
      span.c-permission-piece-text {{ getPermissionDisplayName(permission) }}
</template>

<script>
import { getPermissionDisplayName } from './permissions-utils.js'

export default {
  name: 'PermissionPiece',
  props: {
    permission: String,
    isSelectable: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      ephemeral: {
        isSelected: false
      }
    }
  },
  computed: {
    dynamicClasses () {
      return [
        this.isSelectable ? 'is-unstyled is-selectable' : 'is-non-selectable',
        { 'is-selected': this.isSelectable && this.active }
      ]
    },
    dynamicAttrs () {
      return {
        role: this.isSelectable ? 'button' : undefined
      }
    }
  },
  methods: {
    getPermissionDisplayName,
    onClick () {
      if (this.isSelectable) {
        this.$emit('change', !this.active)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-permission-piece {
  display: inline-flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0.275rem 0.5rem 0.25rem;
  column-gap: 0.25rem;
  border-radius: $radius;
  font-size: $size_4;

  &.is-non-selectable {
    background-color: $general_1;
    color: $text_1;

    i {
      transform: translateY(-1px);
    }
  }

  &.is-selectable {
    column-gap: unset;
    border: 1px solid $general_0;
    cursor: pointer;

    &:hover,
    &:focus {
      border-color: $primary_0;
      color: $primary_0;

      .checkbox > :last-child::before {
        border-color: $primary_0;
      }
    }

    &.is-selected {
      background-color: $primary_2;
      border-color: $primary_2;
      color: $primary_0;

      &:hover,
      &:focus {
        border-color: $primary_0;
      }
    }

    .checkbox {
      margin-right: 0;
    }
  }

  .c-permission-piece-text {
    line-height: 1.275;
  }

  .c-permission-checkbox {
    height: 1.275rem;
    transform: translateY(-1px);
  }
}

.is-dark-theme .c-permission-piece.is-selectable {
  color: $text_0;
}
</style>
