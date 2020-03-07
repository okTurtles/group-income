<template lang='pug'>
form.c-search-form(
  @submit.prevent='submit'
)
  label.field
    .sr-only {{label}}

    .input-combo
      .is-icon(:aria-label='L("Search")')
        i.icon-search

      input.input(
        type='text'
        name='search'
        data-test='search'
        :placeholder='placeholder'
        :value='value'
        @input='$emit("input", $event.target.value)'
      )

      button.is-icon-small(
        v-if='value !== ""'
        :aria-label='L("Clear search")'
        @click='$emit("input", "")'
      )
        i.icon-times
</template>

<script>
import L from '@view-utils/translations.js'

export default {
  name: 'PaymentsSearch',

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

.input-combo {
  align-items: center;

  .is-icon {
    left: 0;
    right: auto;
  }

  .is-icon-small {
    position: absolute;
    right: $spacer-sm;
    background: $general_2;
    border-radius: 50%;

    &:hover {
      background: $general_1;
    }
  }
}
</style>
