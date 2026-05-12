<template lang='pug'>
button.is-unstyled.menu-tile(
  ref='tile'
  @click.stop='onTileClick'
  :class='["is-style-" + variant, { "is-expanded": ephemeral.expanded }]'
  :aria-disabled='isDisabled'
)
  .tile-upper-section(:data-test='testId')
    .tile-text {{ menuName }}
    .tile-info-segment(v-if='$slots.info' @click.stop='')
      slot(name='info')
    i(v-if='!noIcon' :class='iconClasses')

  .tile-lower-section(v-if='isExpandable')
    slot(name='lower')
</template>

<script>

export default {
  name: 'SettingsMenuTile',
  props: {
    variant: {
      type: String,
      default: 'default',
      validator: v => ['default', 'outlined', 'danger', 'disabled'].includes(v)
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
      return [
        this.isExpandable
          ? 'icon-chevron-down'
          : this.icon ? `icon-${this.icon}` : 'icon-chevron-right',
        'tile-icon'
      ]
    },
    isDisabled () {
      return this.variant === 'disabled'
    }
  },
  methods: {
    onTileClick (e) {
      if (this.isDisabled) { return }

      const isLowerSectionClicked = e.target.closest('.tile-lower-section')

      if (!isLowerSectionClicked) {
        this.toggleExpanded()
        this.$emit('click')
      }
    },
    toggleExpanded () {
      if (this.isExpandable && !this.isDisabled) {
        const valToSet = !this.ephemeral.expanded
        const evtName = valToSet ? 'expand' : 'fold'

        this.$emit(evtName)
        this.ephemeral.expanded = valToSet

        if (valToSet) {
          // If expanded, scroll to the tile to make the content visible
          setTimeout(() => {
            this.$refs.tile.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 300)
        }
      }
    }
  }
}
</script>
