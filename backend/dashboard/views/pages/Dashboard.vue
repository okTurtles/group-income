<template lang='pug'>
page-template
  template(#title='') {{ L('Dashboard') }}

  i18n(tag='p') This is 'dashboard' page
</template>

<script>
import PageTemplate from './PageTemplate.vue'

export default {
  name: 'Dashboard',
  components: {
    PageTemplate
  }
}
</script>
