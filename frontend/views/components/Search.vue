<template lang='pug'>
form.c-search-form(
  @submit.prevent='submit'
)
  label.field
    .sr-only {{label}}
    .inputcombo.c-search
      input.input(
        type='text'
        name='search'
        data-test='search'
        :placeholder='placeholder'
        :value='value'
        @input='$emit("input", $event.target.value)'
      )
      .is-icon.c-iconSearch(aria-hidden='true')
        i.icon-search
      .addons
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
  .c-iconSearch {
    position: absolute;
    top: 50%;
    left: 0.75rem;
    transform: translateY(-50%);
    color: $general_0;
    pointer-events: none;
  }

  .input {
    padding-left: 2.5rem;
  }

  .addons {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
  }
}
</style>
