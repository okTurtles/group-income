<template lang='pug'>
button.is-unstyled.menu-tile.c-menu-tile(
  @click.stop='onTileClick'
  :class='["is-style-" + variant, { "is-expanded": ephemeral.expanded }]'
)
  .tile-upper-section(:data-test='testId')
    .tile-text {{ menuName }}
    .tile-info-segment(v-if='$slots.info' @click.stop='')
      slot(name='info')
    i(:class='[isExpandable ? "icon-chevron-down" : "icon-chevron-right", "tile-icon"]')

  transition-expand
    .tile-lower-section(v-if='isExpandable && ephemeral.expanded')
      slot(name='lower')
</template>

<script>
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import TransitionExpand from '@components/TransitionExpand.vue'

export default {
  name: 'GroupSettingsTabMenuItem',
  components: {
    TransitionExpand
  },
  inject: ['groupSettingsTabNames'],
  props: {
    tabId: {
      type: String,
      required: true
    },
    variant: {
      type: String,
      default: 'default',
      validator: v => ['default', 'danger'].includes(v)
    },
    isExpandable: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      ephemeral: {
        expanded: false
      }
    }
  },
  computed: {
    menuName () {
      return this.groupSettingsTabNames[this.tabId]?.displayName || ''
    },
    testId () {
      return this.groupSettingsTabNames[this.tabId]?.dataTest || ''
    }
  },
  methods: {
    onTileClick (e) {
      const isLowerSectionClicked = e.target.closest('.tile-lower-section')

      if (!isLowerSectionClicked) {
        if (this.isExpandable) {
          this.ephemeral.expanded = !this.ephemeral.expanded
        } else {
          this.navigateToTab()
        }
      }
    },
    navigateToTab () {
      this.$router.push({
        name: 'GroupSettingsTab',
        params: { tabId: this.tabId }
      }).catch(logExceptNavigationDuplicated)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-menu-tile {
  position: relative;
}
</style>
