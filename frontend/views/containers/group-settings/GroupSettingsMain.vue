<template lang='pug'>
.c-group-settings-main
  .c-menu-block
    legend.tab-legend
      i.icon-cog.legend-icon
      i18n.legend-text General

    menu.c-menu
      MenuItem(tabId='group-profile')
      MenuItem(tabId='group-currency' :isExpandable='true')
        template(#info='')
          span.has-text-1 {{ groupCurrency }}
  .c-menu-block
    legend.tab-legend
      i.icon-vote-yea.legend-icon
      i18n.legend-text Access & Rules

    menu.c-menu
      MenuItem(tabId='invite-links')
      MenuItem(tabId='roles-and-permissions')
      MenuItem(tabId='voting-rules')
        template(#info='')
          span.has-text-1 {{ currentVotingThreshold }}

  .c-menu-block
    legend.tab-legend
      i.icon-exclamation-triangle.legend-icon
      i18n.legend-text Danger Zone

    menu.c-menu
      MenuItem(tabId='leave-group' variant='danger')
</template>

<script>
import { mapGetters } from 'vuex'
import GroupSettingsTabMenuItem from './GroupSettingsTabMenuItem.vue'
import { getPercentFromDecimal, RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/shared/voting/rules.js'
import { L } from '@common/common.js'

export default {
  name: 'GroupSettingsMain',
  components: {
    MenuItem: GroupSettingsTabMenuItem
  },
  computed: {
    ...mapGetters([
      'groupSettings',
      'groupProposalSettings'
    ]),
    groupCurrency () {
      return this.groupSettings.mincomeCurrency
    },
    currentVotingThreshold () {
      const proposalSettings = this.groupProposalSettings()
      const threshold = proposalSettings.ruleSettings[proposalSettings.rule].threshold
      return proposalSettings.rule === RULE_PERCENTAGE
        ? getPercentFromDecimal(threshold) + '%'
        : proposalSettings.rule === RULE_DISAGREEMENT
          ? L('{threshold} disagreements', { threshold })
          : threshold
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-group-settings-main {
  margin-top: 1rem;

  @include desktop {
    margin-top: 3rem;
  }
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
