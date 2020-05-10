<template lang='pug'>
.c-pagination
  .c-pagination-settings
    i18n.has-text-1(
      tag='span' aria-hidden='true'
    ) Show:
    label.selectsolo.c-select
      i18n.sr-only Show per page
      select.select(
        ref='select'
        @change='updatePagination'
      )
        option(
          v-for='numberPerPage in [10, 20, 30]'
          :index='numberPerPage'
          :value='numberPerPage'
        ) {{ `${numberPerPage} ${L('results')}` }}
    i18n.has-text-1(
      tag='span' aria-hidden='true'
    ) per page

  .c-pagination-controls
    i18n.has-text-1(
      tag='p'
      data-test='paginationInfo'
      :args='{ currentPage: `<span class="has-text-0">1 — 5</span>`, maxPages: `<span class="has-text-0">5</span>`}'
    ) {currentPage} out of {maxPages}

    .c-previous-next
      button.c-control.is-unstyled(
        @click='previousPage'
        :aria-label='L("Previous page")'
      )
        i.icon-chevron-left

      button.c-control.is-unstyled(
        @click='nextPage'
        :aria-label='L("Next page")'
      )
        i.icon-chevron-right
</template>

<script>
export default {
  name: 'PaymentsPagination',
  methods: {
    updatePagination () {
      console.log('Todo: implement update pagination settings')
    },
    previousPage () {
      console.log('Todo: implement previous page functionality')
    },
    nextPage () {
      console.log('Todo: implement next page functionality')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-pagination-settings,
.c-pagination-controls,
.c-previous-next {
  display: flex;
  align-items: center;
}

.c-select {
  margin: 0 0.5rem;
}

.c-control {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  color: $general_0;
  background-color: $general_2;
  margin: 0 0.25rem;

  &:first-child i {
    margin-left: -1px;
  }

  &:last-child i {
    margin-right: -1px;
  }

  &::hover {
    color: $text_0;
    background-color: $general_0;
  }
}
</style>
