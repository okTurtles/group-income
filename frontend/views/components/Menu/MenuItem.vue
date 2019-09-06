<template lang="pug">
//
  MenuItem is a wrapper around ListItem with extra styles
  and to update MenuSelect when an option was selected.
  QUESTION: Is v-bind='$attrs' the correct way to pass down
  the props and slot from MenuItem to ListItem?
list-item(disable-radius='' v-bind='$attrs' on='$listeners' @click='handleSelect')
  slot
</template>
<script>
import ListItem from '@components/ListItem.vue'
export default {
  name: 'MenuItem',
  inject: ['Menu'],
  components: { ListItem },
  inheritAttrs: false,
  methods: {
    handleSelect () {
      this.$listeners.click && this.$listeners.click()
      this.Menu.handleSelect(this.$attrs['item-id']) // Use $attrs to access passed props
    }
  }
}
</script>
