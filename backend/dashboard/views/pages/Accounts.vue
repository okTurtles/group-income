<template lang='pug'>
page-template
  template(#title='') {{ L('Accounts') }}

  i18n(tag='p') This is 'Accounts' page
</template>

<script>
import PageTemplate from './PageTemplate.vue'

export default {
  name: 'Accounts',
  components: {
    PageTemplate
  }
}
</script>
