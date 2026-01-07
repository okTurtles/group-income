<template lang='pug'>
page.c-page
  template(#title='') {{ L('Group Settings') }}
  template(#description='')
    p.p-descritpion.has-text-1 {{ L('Changes to these settings will be visible to all group members') }}

  .c-content-container
    .c-section(
      v-for='block in config.menus'
      :key='block.section'
    )
      legend.tab-legend(v-if='getSectionLegend(block.section)') {{ getSectionLegend(block.section) }}

      menu.c-menu
        button.is-unstyled.menu-tile(
          v-for='item in block.items'
          :key='item.id'
        )
          .tile-text {{ item.name }}
          i.icon-chevron-right.tile-icon
</template>

<script>
import Page from '@components/Page.vue'
import { L } from '@common/common.js'

export default {
  name: 'GroupSettings',
  components: {
    Page
  },
  data () {
    return {
      config: {
        sectionLegends: {
          'general': L('General'),
          'access-and-rules': L('Access & Rules')
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
              { id: 'voting-rules', name: L('Voting Rules') },
              { id: 'invite-links', name: L('Invite links') },
              { id: 'roles-and-permissions', name: L('Roles & Permissions') }
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
  methods: {
    getSectionLegend (section) {
      return this.config.sectionLegends[section]
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

.c-content-container {
  margin-top: 3rem;
}

.c-section {
  width: 100%;
  margin-bottom: 2.5rem;
}

.tab-legend {
  color: $text_1;
  font-size: $size_5;
  text-transform: uppercase;
  margin-bottom: 0.75rem;

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
