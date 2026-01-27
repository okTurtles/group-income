<template lang='pug'>
settings-menu-tile(
  v-bind='propFallThrough'
  @click='onTileClick'
  @expand='$emit("expand")'
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
    },
    icon: String,
    noIcon: Boolean
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
    },
    propFallThrough () {
      return {
        variant: this.variant,
        isExpandable: this.isExpandable,
        testId: this.testId,
        menuName: this.menuName,
        icon: this.icon,
        noIcon: this.noIcon
      }
    }
  },
  methods: {
    onTileClick () {
      if (!this.isExpandable) {
        this.navigateToTab()
      }
      this.$emit('click')
    },
    navigateToTab () {
      if (this.menuItem?.pathTo) {
        this.$router.push({
          path: `/user-settings/${this.menuItem.pathTo}`
        }).catch(logExceptNavigationDuplicated)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
