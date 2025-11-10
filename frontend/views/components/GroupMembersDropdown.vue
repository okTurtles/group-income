<template lang="pug">
.c-dropdown-wrapper(
  v-on-clickaway='onClickAway'
)
  button.is-unstyled.c-dropdown-trigger(
    :class='{ "is-active": ephemeral.isActive, "is-disabled": disabled || noAvailableOption }'
    @click='toggle'
  )
    .c-selected-member(v-if='ephemeral.selected')
      avatar-user.c-avatar(:contractID='ephemeral.selected.contractID' size='xs')
      .c-member-info
        .c-display-name.has-text-bold {{ getDisplayName(ephemeral.selected) }}
        .c-username @{{ ephemeral.selected.username }}
    .c-default-text(v-else)
      i18n(v-if='noAvailableOption') No members to select
      span(v-else) {{ defaultText }}

    .c-dropdown-icon
      i.icon-angle-down

  .c-dropdown-list-wrapper(v-if='!noAvailableOption && ephemeral.isActive')
    ul.c-dropdown-list
      li.c-dropdown-option-item(
        v-for='option in dropdownOptions'
        tabindex='0'
        :key='option.contractID'
        @click.stop='select(option)'
      )
        avatar-user.c-avatar(:contractID='option.contractID' size='xs')
        .c-member-info
          .c-display-name.has-text-bold {{ getDisplayName(option) }}
          .c-username @{{ option.username }}
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { L } from '@common/common.js'
import { mixin as clickaway } from 'vue-clickaway'
import { uniq } from 'turtledash'
import AvatarUser from './AvatarUser.vue'

export default ({
  name: 'GroupMembersDropdown',
  mixins: [clickaway],
  model: {
    prop: 'value',
    event: 'select'
  },
  components: {
    AvatarUser
  },
  props: {
    value: {
      type: Object,
      default: () => null
    },
    groupID: {
      type: String,
      required: false,
      default: ''
    },
    defaultText: {
      type: String,
      required: false,
      default: L('Select a member')
    },
    membersToExclude: {
      type: Array,
      required: false,
      default: () => []
    },
    excludeSelf: {
      type: Boolean,
      required: false
    },
    disabled: {
      type: Boolean,
      default: false
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
      return Object.keys(this.profilesByGroup(this.groupID || this.currentGroupId))
        .map(memberId => this.globalProfile(memberId))
    },
    dropdownOptions () {
      const idsToExclude = uniq([
        ...this.membersToExclude,
        ...(this.excludeSelf ? [this.ourIdentityContractId] : [])
      ])

      return this.allActiveMembers.filter(member => !idsToExclude.includes(member.contractID))
    },
    noAvailableOption () {
      return this.dropdownOptions.length === 0
    }
  },
  methods: {
    open () {
      if (this.noAvailableOption) { return }

      this.ephemeral.isActive = true
      this.$emit('open')
    },
    close () {
      if (this.noAvailableOption) { return }

      this.ephemeral.isActive = false
      this.$emit('blur')
    },
    toggle () {
      if (this.noAvailableOption) { return }

      this.ephemeral.isActive = !this.ephemeral.isActive
    },
    clear () {
      this.ephemeral.selected = null
    },
    onClickAway () {
      this.close()
    },
    getDisplayName (details) {
      return details.displayName || details.username
    },
    select (option) {
      this.ephemeral.selected = option
      this.close()
    }
  },
  watch: {
    'value' (newVal) {
      this.ephemeral.selected = newVal
    },
    'ephemeral.selected' (newVal) {
      this.$emit('select', newVal)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-dropdown-wrapper {
  position: relative;
  width: 100%;

  @include tablet {
    width: max-content;
  }
}

button.c-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  border-radius: $radius;
  border: 1px solid $general_2;
  background-color: $general_2;
  width: 100%;
  max-width: 100%;
  color: $text_0;

  @include tablet {
    width: 20rem;
  }

  &:hover,
  &:focus,
  &.is-active {
    background-color: $general_1;
    border-color: $general_1;

    .c-default-text {
      color: $text_0;
    }
  }

  &.is-disabled {
    pointer-events: none;
    opacity: 0.675;
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

  .c-default-text {
    font-size: $size_5;
    color: $text_1;
  }

  .c-dropdown-icon {
    flex-shrink: 0;
    transition: transform $transitionSpeed;
    color: $text_0;
  }
}

.c-dropdown-list-wrapper {
  position: absolute;
  z-index: $zindex-tooltip;
  left: 0;
  top: 100%;
  height: auto;
  width: 100%;
  max-width: 100%;
  transform: translateY(0.5rem);
  overflow: hidden;
  border: 1px solid $general_2;
  border-radius: $radius;
  background-color: $background_0;
  box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);

  .is-dark-theme & {
    box-shadow: 0 0.5rem 1.25rem rgba(38, 38, 38, 0.895);
  }
}

.c-dropdown-list {
  max-height: 16rem;
  overflow-y: auto;
}

.c-selected-member,
.c-dropdown-option-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0.5rem;
}

.c-selected-member {
  max-width: calc(100% - 1.25rem);
}

.c-dropdown-option-item {
  padding: 0.625rem 0.75rem;
  cursor: pointer;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    display: block;
    bottom: 0;
    left: 0.75rem;
    width: calc(100% - 1.5rem);
    height: 1px;
    border-bottom: 1px solid $general_2;
  }

  &:hover,
  &:focus {
    background-color: $general_1;
    border-color: $general_1;

    &::after {
      display: none;
    }

    .c-default-text {
      color: $text_0;
    }
  }
}

.c-avatar {
  flex-shrink: 0;
}

.c-member-info {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  font-size: 0.725rem;
  flex-grow: 1;
  max-width: calc(100% - 2rem);

  .c-display-name,
  .c-username {
    position: relative;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: inherit;
    line-height: 1.2;
  }

  .c-display-name {
    color: $text_0;
  }

  .c-username {
    font-size: 0.625rem;
    color: $text_1;
  }
}
</style>
