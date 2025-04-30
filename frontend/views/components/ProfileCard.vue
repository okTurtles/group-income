<template lang='pug'>
tooltip(
  ref='tooltip'
  :direction='direction'
  :manual='true'
  :opacity='1'
  :deactivated='deactivated'
  :isVisible='isVisible'
  :aria-label='L("Show profile")'
)
  slot

  template(slot='tooltip')
    profile-card-content(
      v-if='profile'
      :contractID='contractID'
      :deactivated='deactivated'
      :on-post-cta-click='toggleTooltip'
      @modal-close='toggleTooltip'
    )
</template>

<script>
import { mapGetters } from 'vuex'
import Tooltip from '@components/Tooltip.vue'
import ProfileCardContent from './ProfileCardContent.vue'

export default ({
  name: 'ProfileCard',
  components: {
    Tooltip,
    ProfileCardContent
  },
  props: {
    contractID: String,
    direction: {
      type: String,
      validator: (value) => ['left', 'top-left', 'bottom'].includes(value),
      default: 'left'
    },
    deactivated: {
      type: Boolean,
      default: false
    },
    isVisible: Boolean
  },
  computed: {
    ...mapGetters([
      'globalProfile'
    ]),
    profile () {
      return this.globalProfile(this.contractID)
    }
  },
  methods: {
    toggleTooltip () {
      this.$refs.tooltip?.toggle()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-twrapper {
  display: flex;
  align-items: center;

  &:focus {
    outline: none;
  }
}
</style>
