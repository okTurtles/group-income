<template lang='pug'>
.c-group-settings-main
  .c-menu-block
    legend.tab-legend
      i.icon-cog.legend-icon
      i18n.legend-text General

    menu.c-menu
      MenuItem(tabId='group-profile')
      MenuItem(tabId='group-currency')
        template(#info='')
          span.has-text-1 {{ groupCurrency }}

  .c-menu-block
    legend.tab-legend
      i.icon-vote-yea.legend-icon
      i18n.legend-text Access & Rules

    menu.c-menu
      MenuItem(tabId='invite-links')
      MenuItem(tabId='roles-and-permissions')
      MenuItem(
        v-if='configurePublicChannelSupported'
        tabId='public-channels'
        :isExpandable='true'
      )
        template(#info='')
          input.switch.is-small.c-switch(
            type='checkbox'
            name='switch'
            :checked='allowPublicChannels.value'
            :disabled='allowPublicChannels.updating'
            @change='togglePublicChannelCreateAllownace'
            @click.stop=''
          )

        template(#lower='')
          .c-menu-item-lower-section-container
            i18n.c-smaller-title(tag='h3') Allow members to create public channels
            i18n.c-description Let users create public channels. The data in public channels is intended to be completely public and should be treated with the same care and expectations of privacy that one has with normal social media: that is, you should have zero expectation of any privacy of the content you post to public channels.

      MenuItem(tabId='voting-rules')
        template(#info='')
          span.has-text-1 {{ currentVotingThreshold }}

  .c-menu-block
    legend.tab-legend
      i.icon-exclamation-triangle.legend-icon
      i18n.legend-text Danger Zone

    menu.c-menu
      MenuItem(
        tabId='leave-group'
        variant='danger'
        :isExpandable='true'
      )
        template(#lower='')
          .c-menu-item-lower-section-container
            i18n.has-text-1.c-leave-group-text(
              :args='LTags("b")'
              tag='p'
            ) This means you will stop having access to the {b_}group chat{_b} (including direct messages to other group members) and {b_}contributions{_b}. Re-joining the group is possible, but requires other members to vote and reach an agreement.

            .buttons
              i18n.is-danger.is-outlined(
                tag='button'
                ref='leave'
                @click='handleLeaveGroup'
                data-test='leaveModalBtn'
              ) Leave group
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import GroupSettingsTabMenuItem from './GroupSettingsTabMenuItem.vue'
import { getPercentFromDecimal, RULE_PERCENTAGE, RULE_DISAGREEMENT } from '@model/contracts/shared/voting/rules.js'
import { OPEN_MODAL } from '@utils/events.js'
import { L } from '@common/common.js'

export default {
  name: 'GroupSettingsMain',
  components: {
    MenuItem: GroupSettingsTabMenuItem
  },
  data () {
    return {
      allowPublicChannels: {
        updating: false,
        value: false
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'currentGroupOwnerID',
      'ourIdentityContractId',
      'groupProposalSettings'
    ]),
    isGroupAdmin () {
      // TODO: https://github.com/okTurtles/group-income/issues/202
      return false
    },
    configurePublicChannelSupported () {
      // TODO: check if Chelonia server admin allows to create public channels
      return this.isGroupAdmin && false
    },
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
  },
  methods: {
    async togglePublicChannelCreateAllownace (v) {
      const checked = v.target.checked

      if (!this.allowPublicChannels.updating && (this.allowPublicChannels.value !== checked)) {
        this.allowPublicChannels.updating = true

        try {
          await sbp('gi.actions/group/updateSettings', {
            contractID: this.currentGroupId,
            data: { allowPublicChannels: checked }
          })
          this.allowPublicChannels.value = checked
        } catch (err) {
          console.error('GroupSettings togglePublicChannelCreateAllownace() error:', err)
        } finally {
          this.allowPublicChannels.updating = false
        }
      }
    },
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    },
    handleLeaveGroup () {
      if (this.currentGroupOwnerID === this.ourIdentityContractId) {
        this.openProposal('GroupDeletionModal')
      } else {
        this.openProposal('GroupLeaveModal')
      }
    }
  },
  mounted () {
    this.allowPublicChannels.value = this.groupSettings.allowPublicChannels
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

.c-menu-item-lower-section-container {
  position: relative;
  width: 100%;
  padding-top: 1.5rem;

  > * {
    white-space: normal;
  }
}

.c-smaller-title {
  font-size: $size_4;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.c-description {
  margin-top: 0.125rem;
  font-size: $size_4;
  color: $text_1;
}

input.c-switch {
  vertical-align: middle;
}

.c-leave-group-text {
  margin-bottom: 1.5rem;
}
</style>
