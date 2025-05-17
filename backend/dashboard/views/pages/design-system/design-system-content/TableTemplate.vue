<template lang='pug'>
table.table.c-table
  .c-table-header__mobile Code / Demo
  thead.c-table-header__non-mobile
    th code
    th demo

  slot
</template>

<script>
export default {
  name: 'TableTemplate'
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin from600 {
  @media screen and (min-width: 600px) {
    @content;
  }
}

.c-table {
  display: table;
  width: 100%;
  max-width: 800px;
  margin-top: 2rem;
  margin-bottom: 2rem;
  border-spacing: 0 1rem;
  border-bottom: 1px solid $border;
  padding-bottom: 2rem;

  thead {
    position: relative;
    display: none;
    letter-spacing: 1px;
    border-bottom: 1px solid $border;
    text-transform: capitalize;

    th {
      font-size: 0.75rem;
      padding-bottom: 0.75rem;
    }

    @include from600 {
      display: table-header-group;
    }
  }

  tr {
    height: auto;
    vertical-align: baseline;
  }

  .c-table-header__mobile {
    display: block;
    font-size: 0.75rem;
    font-weight: bold;
    letter-spacing: 1px;
    border-bottom: 1px solid $border;
    padding-bottom: 1rem;
    width: 100%;

    @include from600 {
      display: none;
    }
  }
}
</style>
