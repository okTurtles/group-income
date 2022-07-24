<template lang='pug'>
//
  MenuItem is a wrapper around ListItem with extra styles
  and to update MenuSelect when an option was selected.
  QUESTION: Is v-bind='$attrs' the correct way to pass down
  the props and slot from MenuItem to ListItem?
list-item.c-menuItem(disable-radius='' v-bind='$attrs' v-on='$listeners' @click='handleSelect')
  slot
</template>
<script>
import ListItem from '@components/ListItem.vue'
export default ({
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
}: Object)
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-menuItem {
  ::v-deep .c-item-link {
    height: 2rem;
    font-family: "Lato";

    i {
      color: $general_0;
    }

    &.is-active,
    &:hover,
    &:focus {
      background-color: $general_2;

      &::before {
        content: none;
      }
    }
  }
}
</style>
