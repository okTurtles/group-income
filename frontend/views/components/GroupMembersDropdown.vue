<template lang="pug">
.c-dropdown-wrapper(
  v-on-clickaway='onClickAway'
)
  button Implement
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import L from '@common/translations.js'
import { mixin as clickaway } from 'vue-clickaway'

export default ({
  name: 'GroupMembersDropdown',
  mixins: [clickaway],
  props: {
    groupID: {
      type: String,
      required: false,
      default: ''
    },
    defaultText: {
      type: String,
      required: false,
      default: L('Select member')
    },
    membersToExclude: {
      type: Array,
      required: false,
      default: () => []
    }
  },
  data () {
    return {
      ephemeral: {
        selected: '',
        isActive: false
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'profilesByGroup'
    ]),
    allActiveMembers () {
      return this.profilesByGroup(this.groupID || this.currentGroupId)
    }
  },
  methods: {
    init () {
      // TODO: load all active group-members and filter out the ones in membersToExclude
    },
    open () {
      this.ephemeral.isActive = true
      this.$emit('open')
    },
    close () {
      this.ephemeral.isActive = false
      this.$emit('blur')
    },
    toggle () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },
    clear () {
      this.ephemeral.selected = ''
    },
    onClickAway () {
      this.close()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
.c-dropdown-wrapper {
  position: relative;
}
</style>
