<template lang='pug'>
.c-pagination
  .c-pagination-settings
    i18n.has-text-1(
      tag='span' aria-hidden='true'
    ) Show:
    label.selectsolo.c-select
      i18n.sr-only Show per page
      select.select(
        :value='rowsPerPage'
        @change='updatePagination'
      )
        option(
          v-for='count in config.options'
          :index='count'
          :value='count'
        ) {{ `${count} ${L('results')}` }}
    i18n.has-text-1(
      tag='span' aria-hidden='true'
    ) per page

  .c-pagination-controls
    i18n.has-text-1(
      tag='p'
      data-test='paginationInfo'
      :args='{ \
        range: `<span class="has-text-0">${paginationInfo.begin} - ${paginationInfo.end}</span>`, \
        count: `<span class="has-text-0">${paginationInfo.count}</span>` \
      }'
    ) {range} out of {count}

    .c-previous-next
      button.is-icon-small.c-btn(
        :disabled='page === 0'
        @click='previousPage'
        :aria-label='L("Previous page")'
      )
        i.icon-chevron-left

      button.is-icon-small.c-btn(
        :disabled='page + 1 >= maxPages'
        @click='nextPage'
        :aria-label='L("Next page")'
      )
        i.icon-chevron-right
</template>

<script>
export default ({
  name: 'PaymentsPagination',
  props: {
    count: Number,
    page: Number,
    rowsPerPage: Number
    // @change-page('next'|'prev')
    // @change-rows-per-page(String) // Page Number
  },
  data: () => ({
    config: {
      options: [10, 20, 30]
    }
  }),
  computed: {
    maxPages () {
      return Math.ceil(this.count / this.rowsPerPage)
    },
    paginationInfo () {
      const start = this.rowsPerPage * this.page
      return {
        begin: start + 1,
        end: Math.min(start + this.rowsPerPage, this.count),
        count: this.count
      }
    }
  },
  methods: {
    updatePagination (e) {
      this.$emit('change-rows-per-page', +e.target.value)
    },
    previousPage () {
      this.$emit('change-page', 'prev')
    },
    nextPage () {
      this.$emit('change-page', 'next')
    }
  }
}: Object)
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

.c-btn {
  background-color: $general_2;
  margin: 0 0.25rem;

  &[disabled] {
    background-color: $general_2;
    color: $general_0;
  }

  &:hover,
  &:focus {
    background-color: $general_0;
  }

  &:first-child i {
    margin-left: -1px;
  }

  &:last-child i {
    margin-right: -1px;
  }
}
</style>
