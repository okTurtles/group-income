<template>
  <!--
    MenuItem is a wrapper around ListItem with extra styles
    and to update MenuSelect when an option was selected.

    QUESTION: Is v-bind="$attrs" the correct way to pass down
    the props and slot from MenuItem to ListItem?
  -->
  <list-item disableRadius v-bind="$attrs" @click="handleSelect">
    <slot></slot>
  </list-item>
</template>
<script>
import { ListItem } from '../Lists/index.js'
export default {
  name: 'MenuItem',
  inject: ['Menu'],
  components: { ListItem },
  inheritAttrs: false,
  methods: {
    handleSelect () {
      this.Menu.handleSelect(this.$attrs.itemId) // Use $attrs to access passed props
    }
  }
}
</script>
