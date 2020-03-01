<template lang='pug'>
form.c-search-form(
  @submit.prevent='submit'
)
  label.field
    .input-combo
      .is-icon(:aria-label='L("Search")')
        i.icon-search
      input.input(
        type='text'
        name='search'
        data-test='search'
        :placeholder='L("Search payments...")'
        v-model='form.search'
      )
      button.is-icon-small(
        v-if='form.search'
        :aria-label='L("Clear search")'
        @click='form.search = null'
      )
        i.icon-times
</template>

<script>
export default {
  name: 'PaymentsSearch',
  data () {
    return {
      form: {
        search: null
      }
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
