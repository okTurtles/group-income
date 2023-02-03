<template lang='pug'>
page-template
  template(#title='') {{ L('Users') }}

  i18n(tag='p') This is 'Users' page
</template>

<script>
import PageTemplate from './PageTemplate.vue'

export default {
  name: 'Users',
  components: {
    PageTemplate
  }
}
</script>
