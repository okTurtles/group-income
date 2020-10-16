<template lang="pug">
page-section.c-section(:title='L("Invite links")')
  template(#cta='')
    label.selectsolo(:class='{ focus: ephemeral.selectbox.focused }')
      i18n.sr-only Filter links
      select.select(
        ref='select'
        v-model='ephemeral.selectbox.selectedOption'
        @change='unfocusSelect'
      )
        option(value='Active') {{ L('Active links') }}
        option(value='All') {{ L('All links') }}

  i18n.has-text-1.c-invite-description(tag='p') Here's a list of all invite links you own

  banner-scoped(ref='inviteError' data-test='inviteError')

  table.table.table-in-card.c-table(v-if='invitesToShow && invitesToShow.length !== 0')
    thead
      tr
        i18n.c-name(tag='th') created for
        i18n.c-invite-link(tag='th') invite link
        i18n.c-state(tag='th') state
        th.c-action(
          :aria-label='L("action")'
        )
    transition-group(name='slidedown' tag='tbody')
      tr(
        v-for='(item, index) in invitesToShow'
        :key='item.inviteSecret'
      )
        td.c-name
          | {{ item.invitee }}
          tooltip.c-name-tooltip(
            v-if='item.isAnyoneLink'
            direction='top'
            :isTextCenter='true'
            :text='L("This invite link is only available during the onboarding period.")'
          )
            .button.is-icon-smaller.is-primary.c-tip
              i.icon-info
        td.c-invite-link
          link-to-copy.c-invite-link-wrapper(:link='item.inviteLink')
          button.is-icon-small.c-invite-link-button-mobile(
            @click='activateWebShare(item.inviteLink)'
            :aria-label='L("Copy link")'
          )
            i.icon-ellipsis-v
          menu-parent.c-webshare-fallback
            menu-trigger.is-icon-small.c-fallback-trigger(ref='webShareFallbackBtn')
            menu-content.c-dropdown-fallback
              ul
                menu-item(
                  tag='button'
                  icon='link'
                )
                  // #780 TODO test/verify if webShare works in a real mobile device.
                  //      And refactor this markup to only have one menu-parent
                  i18n Copy link
                menu-item(
                  v-if='item.status.isActive'
                  tag='button'
                  item-id='revoke'
                  icon='times'
                  @click='handleRevokeClick(item.inviteSecret)'
                )
                  i18n Revoke Link
        td.c-state
          span.c-state-description {{ item.description }}
          span.c-state-expire(
            v-if='item.expiryInfo'
            :class='{ "is-danger": item.status.isExpired || item.status.isRevoked }'
          ) {{ item.expiryInfo }}
        td.c-action
          menu-parent(v-if='!item.isAnyoneLink & item.status.isActive')
            menu-trigger.is-icon(:aria-label='L("Show list")')
              i.icon-ellipsis-v

            menu-content.c-dropdown-action
              ul
                //- menu-item(
                //-   tag='button'
                //-   item-id='original'
                //-   icon='vote-yea'
                //- )
                //-   // TODO: #925
                //-   i18n See original proposal
                menu-item(
                  v-if='item.status.isActive'
                  tag='button'
                  item-id='revoke'
                  icon='times'
                  @click='handleRevokeClick(item.inviteSecret)'
                )
                  i18n Revoke Link

  .c-empty-list(v-else)
    SvgInvitation

  i18n.c-invite-footer(
    tag='p'
    @click='handleInviteClick'
    :args='{ r1: `<button class="link js-btnInvite">`, r2: "</button>"}'
  ) To generate a new link, you need to {r1}propose adding a new member{r2} to your group.
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import PageSection from '@components/PageSection.vue'
import Tooltip from '@components/Tooltip.vue'
import SvgInvitation from '@svgs/invitation.svg'
import LinkToCopy from '@components/LinkToCopy.vue'
import { buildInvitationUrl } from '@model/contracts/voting/proposals.js'
import { INVITE_INITIAL_CREATOR, INVITE_STATUS } from '@model/contracts/constants.js'
import { mapGetters, mapState } from 'vuex'
import L, { LError } from '@view-utils/translations.js'

export default {
  name: 'InvitationsTable',
  components: {
    BannerScoped,
    PageSection,
    SvgInvitation,
    Tooltip,
    LinkToCopy,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
  },
  data () {
    return {
      ephemeral: {
        selectbox: {
          focused: false,
          selectedOption: 'Active'
        },
        // keep invite in "Active" list for a few seconds after being revoked
        inviteRevokedNow: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUsername'
    ]),
    ...mapState([
      'currentGroupId'
    ]),
    invitesToShow () {
      const { invites } = this.currentGroupState

      if (!invites) { return [] }

      const invitesList = Object.values(invites)
        .filter(invite => invite.creator === INVITE_INITIAL_CREATOR || invite.creator === this.ourUsername)
        .map(this.mapInvite)
      const options = {
        Active: () => invitesList.filter(invite => invite.status.isActive || (invite.status.isRevoked && invite.inviteSecret === this.ephemeral.inviteRevokedNow)),
        All: () => invitesList
      }

      return options[this.ephemeral.selectbox.selectedOption]()
    }
  },
  methods: {
    unfocusSelect () {
      this.$refs.select.blur()
    },
    activateWebShare (inviteLink) {
      if (navigator.share) {
        navigator.share({
          title: L('Your invite'),
          url: inviteLink
        })
      } else {
        this.$refs.webShareFallbackBtn[0].handleClick()
      }
    },
    inviteStatusDescription ({
      isAnyoneLink,
      isInviteExpired,
      isInviteRevoked,
      isAllInviteUsed,
      quantity,
      numberOfResponses
    }) {
      if (isAnyoneLink) return L('{numberOfResponses}/{quantity} used', { numberOfResponses, quantity })
      else if (isAllInviteUsed) return L('Used')
      else if (isInviteRevoked) return L('Not used')
      else return isInviteExpired || isInviteRevoked ? L('Not used') : L('Not used yet')
    },
    readableExpiryInfo (expiryTime) {
      const timeLeft = expiryTime - Date.now()
      const MIL = 1000
      const MIL_MIN = 60 * MIL
      const MIL_HR = MIL_MIN * 60
      const MIL_DAY = 24 * MIL_HR
      let remainder

      const days = Math.floor(timeLeft / MIL_DAY)
      remainder = timeLeft % MIL_DAY
      const hours = Math.floor(remainder / MIL_HR)
      remainder = remainder % MIL_HR
      const minutes = Math.ceil(remainder / MIL_MIN)

      if (days) return L('{days}d {hours}h {minutes}m left', { days, hours, minutes })
      if (hours) return L('{hours}h {minutes}m left', { hours, minutes })
      if (minutes) return L('{minutes}m left', { minutes })
      return L('Expired')
    },
    mapInvite ({
      creator,
      expires: expiryTime,
      invitee,
      inviteSecret,
      quantity,
      responses,
      status
    }) {
      const isAnyoneLink = creator === INVITE_INITIAL_CREATOR
      const isInviteExpired = expiryTime <= 0
      const isInviteRevoked = status === INVITE_STATUS.REVOKED
      const numberOfResponses = Object.keys(responses).length
      const isAllInviteUsed = numberOfResponses === quantity

      return {
        isAnyoneLink,
        invitee: isAnyoneLink ? L('Anyone') : invitee,
        inviteSecret,
        inviteLink: buildInvitationUrl(this.currentGroupId, inviteSecret),
        description: this.inviteStatusDescription({
          isAnyoneLink, isInviteExpired, isInviteRevoked, isAllInviteUsed, quantity, numberOfResponses
        }),
        expiryInfo: isInviteExpired ? L('Expired') : isInviteRevoked ? L('Revoked') : isAllInviteUsed ? '' : this.readableExpiryInfo(expiryTime),
        status: {
          isExpired: isInviteExpired,
          isActive: !isInviteExpired && !isInviteRevoked && !isAllInviteUsed,
          isRevoked: isInviteRevoked
        }
      }
    },
    handleInviteClick (e) {
      if (e.target.classList.contains('js-btnInvite')) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'AddMembers')
      }
    },
    async handleRevokeClick (inviteSecret) {
      if (!confirm(L('Are you sure you want to revoke this link? This action cannot be undone.'))) {
        return null
      }

      try {
        this.ephemeral.inviteRevokedNow = inviteSecret
        const message = await sbp('gi.contracts/group/inviteRevoke/create', {
          inviteSecret
        }, this.currentGroupId)
        await sbp('backend/publishLogEntry', message)
        setTimeout(() => {
          this.ephemeral.inviteRevokedNow = null
        }, 2000)
      } catch (e) {
        this.ephemeral.inviteRevokedNow = null
        console.error('InvitationsTable.vue handleRevokeClick() error:', e)
        this.$refs.inviteError.danger(L('Failed to revoke link. {reportError}', LError(e)))
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-section {
  position: relative;
}

.c-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-invite-description {
  margin: 0.5rem 0;
}

.c-table {
  table-layout: fixed;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;

  tr {
    display: grid;
    grid-template-columns: 28.4% 36.1% 23.7% auto;
    grid-template-areas: "name invite-link state action";
  }

  @include phone {
    thead tr {
      grid-template-columns: 81% auto;
      grid-template-areas: "name invite-link";
    }

    tbody tr {
      grid-template-columns: 81% auto;
      grid-template-rows: 1fr 1fr;
      grid-template-areas:
        "name invite-link"
        "state invite-link";
    }
  }

  th,
  td {
    display: flex;
    align-items: center;
  }

  .c-name {
    grid-area: name;
    padding-right: 1.5rem;
    line-height: 1.3125rem;
    align-items: center;

    .c-tip {
      margin-left: $size_4 / 2;
      line-height: 1.3125rem;
    }
  }

  .c-invite-link {
    position: relative;
    grid-area: invite-link;
    padding-right: 1.5rem;

    &-wrapper {
      display: inherit;
      align-items: inherit;
      width: 100%;
    }

    .c-invite-link-button-mobile {
      display: none;
    }

    @include phone {
      justify-content: flex-end;
      padding-right: 0.5rem;

      &-wrapper {
        display: none;
      }

      .c-invite-link-button-mobile {
        display: inline-block;
      }
    }
  }

  th.c-invite-link {
    @include phone {
      white-space: nowrap;
      opacity: 0;
    }
  }

  .c-state {
    grid-area: state;
    padding-right: 3px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;

    .c-state-expire {
      line-height: $size_3;
      font-size: $size_5;
      color: $text-1;

      &.is-danger {
        color: $danger_0;
      }
    }

    @include phone {
      flex-direction: row;
      align-items: baseline;
      justify-content: flex-start;
      padding-left: 1rem;
    }
  }

  th.c-state {
    @include phone {
      display: none;
    }
  }

  td.c-state .c-state-expire {
    @include phone {
      &::before {
        content: "\00b7";
        display: inline-block;
        color: $text_0;
        padding: 0 0.25rem;
      }
    }
  }

  .c-action {
    grid-area: action;
    justify-content: flex-end;

    .c-invite-action-button {
      margin-right: 0.5rem;
    }

    @include until($tablet) {
      display: none;
    }
  }

  .c-dropdown-action,
  .c-dropdown-fallback {
    width: max-content;
    transform: translateX(-100%);
  }

  .c-dropdown-action {
    min-width: 13.375rem;
    margin: 3.5rem 0 0 3rem;
  }
  .c-dropdown-fallback {
    min-width: 8.5rem;
    margin-top: 2rem;
  }

  .c-webshare-fallback {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 0.5rem;
    z-index: $zindex-tooltip;
  }

  .c-fallback-trigger {
    width: 0;
    height: 0;
  }
}

.c-empty-list {
  margin: 1.5rem 0;
  text-align: center;
}

.c-name-tooltip {
  text-align: center;
}

.c-active-button {
  .c-arrow {
    margin-right: 0;
  }
}
</style>
