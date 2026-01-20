<template lang='pug'>
settings-menu-tile(
  :isExpandable='isExpandable'
  :variant='variant'
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
  name: 'GroupSettingsTabMenuItem',
  components: {
    SettingsMenuTile
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
    onTileClick () {
      if (!this.isExpandable) {
        this.navigateToTab()
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
