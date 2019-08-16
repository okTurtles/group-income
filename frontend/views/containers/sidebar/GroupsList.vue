<template lang='pug'>
div(v-if='groupsByName.length')
  menu-parent(@select='handleMenuSelect')
    menu-trigger.c-trigger(:class="`has-text-${isDarkTheme ? 'white' : 'dark'}`")
      avatar.c-avatar(
        src='/assets/images/default-avatar.png'
        :alt='groupSettings.groupName'
        :blobURL='groupSettings.groupPicture'
      )
      | {{ groupSettings.groupName }}
      i.icon-angle-down

    menu-content
      menu-header
        i18n Your Groups
      ul
        menu-item(
          v-for='(group, index) in groupsByName'
          :key='`group-${index}`'
          tag='button'
          :itemid='group.contractID'
          :isactive='currentGroupId === group.contractID'
          :hasdivider='index === groupsByName.length - 1'
        )
          | {{ group.groupName }}
        menu-item(tag='router-link' to='/new-group/name' icon='plus')
          i18n Create a new group

  ul.c-menu-list(:class="`has-text-${isDarkTheme ? 'white' : 'dark'}`")
    // TODO/BUG: Mobile - hide navbar after going to a page
    list-item(tag='router-link' icon='columns' to='/dashboard')
      i18n Dashboard
    list-item(tag='router-link' icon='chart-pie' to='/contributions')
      i18n Contributions
    list-item(tag='router-link' icon='tag' to='/pay-group')
      i18n Pay Group
    list-item(tag='router-link' icon='comment' to='/group-chat' :badgeCount='3')
      i18n Group Chat
    list-item(tag='router-link' icon='cog' to='/group-settings')
      i18n Group Settings
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '@components/Menu/index.js'
import ListItem from '@components/ListItem.vue'
import Avatar from '@components/Avatar.vue'

export default {
  name: 'GroupsList',
  components: {
    MenuParent,
    MenuContent,
    MenuHeader,
    MenuTrigger,
    MenuItem,
    ListItem,
    Avatar
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'groupsByName',
      'isDarkTheme'
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

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-item {
  margin-bottom: 0.125rem;
}

.c-trigger {
  padding: 0 $spacer-sm;
  margin: 0 $spacer-sm $spacer-sm $spacer-sm;
  width: calc(100% - 1rem);
  line-height: 1;
  overflow: hidden;
  background-color: $primary-bg-s;
  transition: background-color ease-in 0.3s;
  justify-content: flex-start;
  font-size: $size-4;
  font-weight: bold;

  .c-avatar {
    margin-right: 0.5rem;
    transition: transform cubic-bezier(0.18, 0.89, 0.32, 1.28) 0.3s;
  }

  i {
    color: inherit;
    margin-left: auto;
    margin-right: 0.5rem;
  }

  &:hover,
  &:focus {
    box-shadow: none;
  }

  &.has-text-white {
    &:hover,
    &:focus {
      color: var(--primary-text-hover) !important;
    }
  }
}
</style>
