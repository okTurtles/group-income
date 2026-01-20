<template lang='pug'>
button.is-unstyled.menu-tile(
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
import TransitionExpand from './TransitionExpand.vue'

export default {
  name: 'SettingsMenuTile',
  components: {
    TransitionExpand
  },
  props: {
    variant: {
      type: String,
      default: 'default',
      validator: v => ['default', 'danger'].includes(v)
    },
    isExpandable: {
      type: Boolean,
      default: false
    },
    testId: {
      type: String,
      default: ''
    },
    menuName: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      ephemeral: {
        expanded: false
      }
    }
  },
  methods: {
    onTileClick (e) {
      const isLowerSectionClicked = e.target.closest('.tile-lower-section')

      if (!isLowerSectionClicked) {
        if (this.isExpandable) {
          this.ephemeral.expanded = !this.ephemeral.expanded
        }

        this.$emit('click')
      }
    }
  }
}
</script>
