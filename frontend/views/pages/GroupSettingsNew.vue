<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='')
    p.p-descritpion.has-text-1 {{ L('Changes to these settings will be visible to all group members') }}

  transition(:name='transitionName' mode='out-in' appear)
    .c-tab-content-container(v-if='tabId')
      div Current tab ID: {{ tabId }}
      button.link(@click.stop='backToMenu') Back to menu

    .c-settings-menu-container(v-else)
      .c-menu-block(
        v-for='block in config.menus'
        :key='block.section'
      )
        legend.tab-legend(v-if='getSectionLegend(block.section)')
          i(:class='["icon-" + getSectionIcon(block.section), "legend-icon"]')
          span.legend-text {{ getSectionLegend(block.section) }}

        menu.c-menu
          button.is-unstyled.menu-tile(
            v-for='item in block.items'
            :key='item.id'
            :class='{ "is-style-danger": item.id === "leave-group" }'
            @click.stop='navigateToTab(item.id)'
          )
            .tile-text {{ item.name }}
            i.icon-chevron-right.tile-icon
</template>

<script>
import Page from '@components/Page.vue'
import { L } from '@common/common.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

export default {
  name: 'GroupSettings',
  components: {
    Page
  },
  data () {
    return {
      config: {
        legends: {
          'general': { text: L('General'), icon: 'cog' },
          'access-and-rules': { text: L('Access & Rules'), icon: 'vote-yea' }
        },
        menus: [
          {
            section: 'general',
            items: [
              { id: 'group-profile', name: L('Group Profile') },
              { id: 'group-currency', name: L('Group Currency') }
            ]
          },
          {
            section: 'access-and-rules',
            items: [
              { id: 'invite-links', name: L('Invite links') },
              { id: 'roles-and-permissions', name: L('Roles & Permissions') },
              { id: 'voting-rules', name: L('Voting Rules') }
            ]
          },
          {
            section: 'misc',
            items: [
              { id: 'leave-group', name: L('Leave Group') }
            ]
          }
        ]
      }
    }
  },
  computed: {
    tabId () {
      return this.$route.params.tabId || ''
    },
    transitionName () {
      return this.tabId ? 'slide-prev' : 'slide-next'
    }
  },
  methods: {
    getSectionLegend (section) {
      return this.config.legends[section]?.text || ''
    },
    getSectionIcon (section) {
      return this.config.legends[section]?.icon || ''
    },
    navigateToTab (tabId) {
      this.$router.push({
        name: 'GroupSettingsNewTab',
        params: { tabId }
      }).catch(logExceptNavigationDuplicated)
    },
    backToMenu () {
      this.$router.push({ name: 'GroupSettingsNew' }).catch(logExceptNavigationDuplicated)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-page ::v-deep .p-main {
  max-width: 37rem;
}

.p-descritpion {
  display: none;
  margin-top: 0.25rem;

  @include desktop {
    display: block;
  }
}

.c-settings-menu-container,
.c-tab-content-container {
  margin-top: 3rem;
}

.c-menu-block {
  width: 100%;
  margin-bottom: 2.5rem;
}

.tab-legend {
  color: $text_1;
  font-size: $size_5;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;

  .legend-icon {
    display: inline-block;
    margin-right: 0.375rem;
  }

  @include desktop {
    letter-spacing: 0.1px;
  }
}

.c-menu {
  position: relative;
  display: flex;
  flex-direction: column;
  row-gap: 0.75rem;
  width: 100%;
}
</style>
