<template>
  <div v-if="groupsByName.length">
    <menu-parent @select="handleMenuSelect">
      <menu-trigger hideWhenActive class="c-trigger is-fullwidth has-text-black has-text-weight-bold is-size-5 gi-is-justify-between gi-is-unstyled">
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

    <list>
      <!-- TODO/BUG: Mobile - hide navbar after going to a page -->
      <list-item tag="router-link" icon="columns"
        to="/dashboard">
          <i18n>Dashboard</i18n>
      </list-item>
      <list-item tag="router-link" icon="comment"
        to="/group-chat" :badgeCount="3">
        <i18n>Chat</i18n>
      </list-item>
      <list-item tag="router-link" icon="chart-pie"
        to="/contributions">
          <i18n>Contributions</i18n>
      </list-item>
      <list-item tag="router-link" icon="tag"
        to="/pay-group">
          <i18n>Pay Group</i18n>
      </list-item>

      <list-item v-if="ephemeral.isCollapseOpen" tag="router-link" variant="secondary" icon="gear" to="/group-settings">
          <i18n>Settings</i18n>
      </list-item>
      <list-item v-if="ephemeral.isCollapseOpen" tag="button" variant="secondary" icon="times" class="has-text-danger">
          <i18n>Leave Group</i18n>
      </list-item>

      <list-item tag="button" variant="secondary"
        :icon="ephemeral.isCollapseOpen ? 'angle-up' : 'angle-down'"
        @click="toggleShowMore">
          <i18n v-if="ephemeral.isCollapseOpen">Show less</i18n>
          <i18n v-else>Show more</i18n>
      </list-item>

    </list>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-trigger-icon {
  color: inherit;
}

.c-trigger {
  padding: $gi-spacer $gi-spacer-sm;
  line-height: 1;
  overflow: hidden;

  &:hover,
  &:focus {
    background-color: $primary-bg-a;
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

export default {
  name: 'YourGroupsList',
  components: {
    MenuParent,
    MenuContent,
    MenuHeader,
    MenuTrigger,
    MenuItem,
    List,
    ListItem
  },
  data () {
    return {
      ephemeral: {
        isCollapseOpen: false
      }
    }
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
    },
    toggleShowMore () {
      this.ephemeral.isCollapseOpen = !this.ephemeral.isCollapseOpen
    }
  }
}
</script>
