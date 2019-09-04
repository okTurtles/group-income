<template lang='pug'>
  transition(:name='transitionName' mode='')
    div(v-show='isActive' class='tab-item')
      slot
</template>

<script>
export default {
  name: 'TabItem',

  data () {
    return {
      isActive: false,
      transitionName: null
    }
  },

  methods: {
    changeTab (isActive, transitionName) {
      this.transitionName = transitionName
      this.isActive = isActive
    }
  },

  created () {
    this.$parent.tabItems.push(this)
  },

  beforeDestroy () {
    const index = this.$parent.tabItems.indexOf(this)
    if (index >= 0) {
      this.$parent.tabItems.splice(index, 1)
    }
  }
}
</script>
