<template lang='pug'>
page-template
  template(#title='') {{ L('Contacts') }}

  i18n(tag='p') This is 'contacts' page
</template>

<script>
import PageTemplate from './PageTemplate.vue'

export default {
  name: 'Contacts',
  components: {
    PageTemplate
  }
}
</script>
