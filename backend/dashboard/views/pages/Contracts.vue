<template lang='pug'>
page-template.c-page-contracts
  template(#title='') {{ L('Contracts') }}

  i18n(tag='p') This is 'contracts' page

  dropdown.c-filter-menu(defaultItemId='all-contracts' :options='ephemeral.dummyFilterOptions')
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import Dropdown from '@components/Dropdown.vue'
import L from '@common/translations.js'

export default {
  name: 'Contracts',
  components: {
    PageTemplate,
    Dropdown
  },
  data () {
    return {
      ephemeral: {
        dummyFilterOptions: [
          { id: 'all-contracts', name: L('All contracts') },
          { id: 'option-2', name: L('Option 2') },
          { id: 'option-3', name: L('Option 3') },
          { id: 'option-4', name: L('Option 4') }
        ]
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page-contracts {
  position: relative;
}
</style>
