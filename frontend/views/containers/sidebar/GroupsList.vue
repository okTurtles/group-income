<template>
  <div v-if="groupsByName.length">
    <menu-parent @select="handleMenuSelect">
      <menu-trigger hideWhenActive class="c-trigger is-fullwidth has-text-black has-text-weight-bold is-size-6 gi-is-unstyled">
        <!-- TODO: Once the groupPicture is implemented :src="groupPicture" :alt="group.groupName"-->
        <avatar class="c-avatar"
          size="sm"
          src=""
          alt=""
          hasMargin
        />
        {{this.currentGroupState && this.currentGroupState.groupName}}
        <i class="fa fa-angle-down c-fa c-trigger-icon"></i>
      </menu-trigger>

      <menu-content class="c-content">
        <menu-header>
          <i18n>Your Groups</i18n>
        </menu-header>
        <list hasMargin>
          <menu-item v-for="(group, index) in groupsByName"
            :key="`group-${index}`"
            tag="button"
            :itemId="group.contractID"
            :isActive="currentGroupId === group.contractID"
            :hasDivider="index === groupsByName.length - 1">
            {{ group.groupName }}
          </menu-item>
          <menu-item tag="router-link" to="/new-group/name" icon="plus">
            <i18n>Create a new group</i18n>
          </menu-item>
        </list>
      </menu-content>
    </menu-parent>

    <list class="c-menu-list">
      <!-- TODO/BUG: Mobile - hide navbar after going to a page -->
      <list-item tag="router-link" icon="columns"
        to="/dashboard">
          <i18n>Dashboard</i18n>
      </list-item>
      <list-item tag="router-link" icon="chart-pie"
        to="/contributions">
          <i18n>Contributions</i18n>
      </list-item>
      <list-item tag="router-link" icon="tag"
        to="/pay-group">
          <i18n>Pay Group</i18n>
      </list-item>
      <list-item tag="router-link" icon="comment"
        to="/group-chat" :badgeCount="3">
        <i18n>Group Chat</i18n>
      </list-item>
      <list-item tag="router-link" icon="cog"
        to="/group-settings">
          <i18n>Group Settings</i18n>
      </list-item>
    </list>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-menu-list {
  li {
    margin-bottom: 0.125rem;
  }

  & /deep/ .c-item-link{
    &.is-active:hover,
    &:hover{
      background-color: $primary-bg-a;
    }
  }
}

.c-trigger-icon {
  color: inherit;
  margin-left: auto;
  margin-right: 0.5rem;
}

.c-trigger {
  padding: 0 $gi-spacer-sm;
  margin: 0 $gi-spacer-sm $gi-spacer-sm $gi-spacer-sm;
  width: calc(100% - 1rem);
  line-height: 1;
  overflow: hidden;
  background-color: $primary-bg-s;

  &:hover,
  &:focus {
    background-color: $body-background-color;
  }
}

.c-content {
  width: 100%;
}
</style>
<script>
import { mapGetters, mapState } from 'vuex'
import { List, ListItem } from '../../components/Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../../components/Menu/index.js'
import Avatar from '../../components/Avatar.vue'

export default {
  name: 'YourGroupsList',
  components: {
    MenuParent,
    MenuContent,
    MenuHeader,
    MenuTrigger,
    MenuItem,
    List,
    ListItem,
    Avatar
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'currentGroupState',
      'groupsByName'
    ])
  },
  methods: {
    handleMenuSelect (id) {
      id && this.changeGroup(id)
    },
    changeGroup (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    }
  }
}
</script>
