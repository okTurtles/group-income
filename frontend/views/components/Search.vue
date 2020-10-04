<template lang='pug'>
form.c-search-form(
  @submit.prevent='submit'
)
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
      )
      .addons
        button.c-clear.is-icon-small(
          v-if='value !== ""'
          :aria-label='L("Clear search")'
          @click='$emit("input", "")'
        )
          i.icon-times
</template>

<script>
import L from '@view-utils/translations.js'

export default {
  name: 'Search',

  props: {
    value: {
      type: String,
      required: true
    },

    placeholder: {
      type: String,
      default: L('Search...')
    },

    label: {
      type: String,
      required: true
    }
  },

  watch: {
    value () {
      this.$emit('input', this.value)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-search {
  .addons {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
  }

  // hide close by default...
  .input + .addons button {
    opacity: 0;
  }

  // visible when interacted
  .input:focus + .addons .c-clear,
  .c-clear:hover,
  .c-clear:focus {
    opacity: 1;
  }

  .c-clear {
    background-color: $general_2;

    &:hover,
    &:focus {
      background-color: $general_1;
    }
  }
}
</style>
