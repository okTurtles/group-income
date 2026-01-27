<template lang='pug'>
button.is-unstyled.menu-tile(
  ref='tile'
  @click.stop='onTileClick'
  :class='["is-style-" + variant, { "is-expanded": ephemeral.expanded }]'
)
  .tile-upper-section(:data-test='testId')
    .tile-text {{ menuName }}
    .tile-info-segment(v-if='$slots.info' @click.stop='')
      slot(name='info')
    i(v-if='!noIcon' :class='iconClasses')

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
      validator: v => ['default', 'outlined', 'danger'].includes(v)
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
    },
    icon: {
      type: String,
      default: ''
    },
    noIcon: {
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
    iconClasses () {
      return this.noIcon
        ? ''
        : [
            this.isExpandable
              ? 'icon-chevron-down'
              : this.icon ? `icon-${this.icon}` : 'icon-chevron-right',
            'tile-icon'
          ]
    }
  },
  methods: {
    onTileClick (e) {
      const isLowerSectionClicked = e.target.closest('.tile-lower-section')

      if (!isLowerSectionClicked) {
        if (this.isExpandable) {
          const valToSet = !this.ephemeral.expanded
          const evtName = valToSet ? 'expand' : 'fold'

          this.$emit(evtName)
          this.ephemeral.expanded = valToSet

          if (valToSet) {
            // If expanded, scroll to the tile to make the content visible
            setTimeout(() => {
              this.$refs.tile.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 250)
          }
        }

        this.$emit('click')
      }
    }
  }
}
</script>
