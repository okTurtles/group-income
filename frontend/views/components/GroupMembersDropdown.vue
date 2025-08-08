<template lang="pug">
.c-dropdown-wrapper(
  v-on-clickaway='onClickAway'
)
  button.is-unstyled.c-dropdown-trigger(
    :class='{ "is-active": ephemeral.isActive }'
    @click='toggle'
  )
    .c-selected-member(v-if='ephemeral.selected')
      avatar-user(:contractID='ephemeral.selected.contractID' size='xs')
      .c-member-info
        .c-name.has-text-bold {{ getDisplayName(ephemeral.selected) }}
        .c-username @{{ ephemeral.selected.username }}
    .c-default-text(v-else) {{ defaultText }}

    .c-dropdown-icon
      i.icon-angle-down
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { L } from '@common/common.js'
import { mixin as clickaway } from 'vue-clickaway'
import AvatarUser from './AvatarUser.vue'

export default ({
  name: 'GroupMembersDropdown',
  mixins: [clickaway],
  components: {
    AvatarUser
  },
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
        selected: null,
        isActive: false
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'profilesByGroup',
      'ourIdentityContractId',
      'globalProfile'
    ]),
    allActiveMembers () {
      const groupMemberProfiles = Object.keys(this.profilesByGroup(this.groupID || this.currentGroupId))
        .map(memberId => this.globalProfile(memberId))

      return groupMemberProfiles
    }
  },
  methods: {
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
    },
    getDisplayName (details) {
      return details.displayName || details.username
    }
  },
  created () {
    this.ephemeral.selected = this.globalProfile(this.ourIdentityContractId)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-dropdown-wrapper {
  position: relative;
  width: max-content;
}

button.c-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  border: 1px solid $general_2;
  background-color: $general_2;
  width: 100%;

  @include tablet {
    width: 20rem;
  }

  &:hover,
  &:focus,
  &.is-active {
    border-color: $general_1;
  }

  &.is-active {
    .c-dropdown-icon {
      transform: rotate(180deg);
    }
  }

  .c-selected-member,
  .c-default-text {
    flex-grow: 1;
  }

  .c-selected-member {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    column-gap: 0.5rem;
  }

  .c-member-info {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    font-size: 0.7rem;
  }

  .c-username {
    color: $text_1;
    font-size: 0.625rem;
  }

  .c-dropdown-icon {
    flex-shrink: 0;
    transition: transform $transitionSpeed;
  }
}
</style>
