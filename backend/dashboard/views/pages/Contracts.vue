<template lang='pug'>
page-template
  template(#title='') {{ L('Contracts') }}

  i18n(tag='p') This is 'contracts' page
</template>

<script>
import PageTemplate from './PageTemplate.vue'

export default {
  name: 'Contracts',
  components: {
    PageTemplate
  }
}
</script>
