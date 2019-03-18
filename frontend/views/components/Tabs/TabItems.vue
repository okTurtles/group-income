<template lang='pug'>
  transition(:name='transitionName')
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
    // Activate tab, alter animation name based on the index.
    activate(oldIndex, index) {
      this.transitionName = index < oldIndex
        ? 'slide-next'
        : 'slide-prev'
      this.isActive = true
    },
    // Deactivate tab, alter animation name based on the index.
    deactivate(oldIndex, index) {
      this.transitionName = index < oldIndex
        ? 'slide-next'
        : 'slide-prev'
      this.isActive = false
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
