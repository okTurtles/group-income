<template lang='pug'>
settings-menu-tile(
  :variant='variant'
  :isExpandable='isExpandable'
  :testId='testId'
  :menuName='menuName'
  @click='onTileClick'
)
  template(v-if='$slots.info' #info='')
    slot(name='info')
  template(v-if='$slots.lower' #lower='')
    slot(name='lower')
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import SettingsMenuTile from '@components/SettingsMenuTile.vue'

export default {
  name: 'UserSettingsTabMenuItem',
  inject: ['userSettingsTabNames'],
  components: {
    SettingsMenuTile
  },
  props: {
    tabId: {
      type: String,
      required: true
    },
    variant: {
      type: String,
      default: 'default',
      validator: v => ['default', 'outlined', 'danger'].includes(v)
    },
    isExpandable: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    menuItem () {
      return this.userSettingsTabNames[this.tabId] || null
    },
    menuName () {
      return this.menuItem?.name || ''
    },
    testId () {
      return this.menuItem?.dataTest || ''
    }
  },
  methods: {
    onTileClick () {
      if (!this.isExpandable) {
        this.navigateToTab()
      }
    },
    navigateToTab () {
      if (this.menuItem.subPath) {
        this.$router.push({
          path: `/user-settings/${this.menuItem.subPath}`
        }).catch(logExceptNavigationDuplicated)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
