<template lang='pug'>
form.c-search-form(@submit.prevent='')
  label.field
    .sr-only {{label}}
    .inputgroup.c-search
      .is-icon.prefix(aria-hidden='true')
        i.icon-search
      input.input(
        type='text'
        name='search'
        data-test='search'
        :placeholder='placeholder'
        :value='value'
        @keyup.esc='$emit("input", "")'
        @input='$emit("input", $event.target.value)'
        v-focus='autofocus'
      )
      .addons
        .button.c-clear.is-icon-small(
          v-if='value !== ""'
          :aria-label='L("Clear search")'
          @click='$emit("input", "")'
        )
          i.icon-times
</template>

<script>
import { L } from '@common/common.js'

export default ({
  name: 'Search',
  props: {
    value: {
      type: String,
      required: false
    },
    placeholder: {
      type: String,
      default: L('Search...')
    },
    label: {
      type: String,
      required: true
    },
    autofocus: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    value () {
      this.$emit('input', this.value)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-search {
  .addons {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
  }

  // visible when interacted
  .input:focus + .addons .c-clear,
  .input:hover + .addons .c-clear {
    opacity: 1;
  }

  .c-clear {
    // hide close by default...
    opacity: 0;
    background-color: $general_2;

    &:hover,
    &:focus {
      opacity: 1;
      background-color: $general_1;
    }
  }
}
</style>
