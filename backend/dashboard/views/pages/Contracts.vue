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
          { id: 'mailbox', name: L('Mailbox') },
          { id: 'chatroom', name: L('Chatroom') },
          { id: 'identity', name: L('Identity') },
          { id: 'group', name: L('Group') }
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

.c-filter-menu {
  position: absolute !important;
  top: 2rem;
  right: 1rem;
}
</style>
