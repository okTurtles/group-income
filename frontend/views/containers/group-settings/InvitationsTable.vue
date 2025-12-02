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

  banner-scoped(ref='inviteError' allow-a data-test='inviteError')

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
        :key='index'
      )
        td.c-name
          | {{ item.invitee }}
          tooltip.c-name-tooltip(
            v-if='item.isAnyoneLink'
            :direction='ephemeral.isMobile ? "right" : "top"'
            :isTextCenter='true'
            :anchorToElement='true'
            :text='L("Anyone with this link can join the group.")'
          )
            .button.is-icon-smaller.is-primary.c-tip
              i.icon-info
        td.c-invite-link
          link-to-copy.c-invite-link-wrapper(:link='item.inviteLink')

          menu-parent.c-invite-link-options-mobile.hide-tablet
            menu-trigger.is-icon-small
              i.icon-ellipsis-v
            menu-content.c-dropdown-invite-link
              ul
                menu-item(
                  v-if='!item.isAnyoneLink'
                  tag='button'
                  item-id='original'
                  @click='handleSeeOriginal(item)'
                  icon='check-to-slot'
                )
                  i18n See original proposal
                menu-item(
                  tag='button'
                  icon='link'
                  @click='copyInviteLink(item.inviteLink)'
                )
                  i18n Copy link
                menu-item(
                  v-if='showRevokeLinkMenu(item)'
                  tag='button'
                  item-id='revoke'
                  icon='times'
                  @click.stop='handleRevokeClick(item.id)'
                )
                  i18n Revoke Link
        td.c-state
          span.c-state-description {{ item.description }}
          span.c-state-expire(
            v-if='item.expiryInfo'
            :class='{ "is-danger": item.status.isExpired || item.status.isRevoked }'
          ) {{ item.expiryInfo }}
        td.c-action
          menu-parent(v-if='showRevokeLinkMenu(item)')
            menu-trigger.is-icon(:aria-label='L("Show list")')
              i.icon-ellipsis-v

            menu-content.c-dropdown-action
              ul
                menu-item(
                  v-if='!item.isAnyoneLink'
                  tag='button'
                  item-id='original'
                  @click='handleSeeOriginal(item)'
                  icon='check-to-slot'
                )
                  i18n See original proposal
                menu-item(
                  v-if='item.status.isActive'
                  tag='button'
                  item-id='revoke'
                  icon='times'
                  @click.stop='handleRevokeClick(item.id)'
                )
                  i18n Revoke Link

  .c-empty-list(v-else)
    SvgInvitation

  i18n.c-invite-footer(
    tag='p'
    @click='handleInviteClick'
    :args='{ r1: `<button class="link js-btnInvite">`, r2: "</button>"}'
  ) To generate a new link, you need to {r1}propose adding a new member{r2} to your group.

  input.c-invisible-input(
    type='text'
    ref='copyInput'
  )
</template>

<script>
import sbp from '@sbp/sbp'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import PageSection from '@components/PageSection.vue'
import Tooltip from '@components/Tooltip.vue'
import SvgInvitation from '@svgs/invitation.svg'
import LinkToCopy from '@components/LinkToCopy.vue'
import { INVITE_STATUS } from '@chelonia/lib/constants'
import { INVITE_INITIAL_CREATOR, GROUP_PERMISSIONS } from '@model/contracts/shared/constants.js'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters, mapState } from 'vuex'
import { L, LTags } from '@common/common.js'
import { buildInvitationUrl } from '@view-utils/buildInvitationUrl.js'
import { timeLeft } from '@view-utils/time.js'

export default ({
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
        inviteRevokedNow: null,
        isMobile: false
      },
      matchMediaMobile: null
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourIdentityContractId',
      'ourUserDisplayName',
      'currentGroupOwnerID',
      'currentWelcomeInvite',
      'groupShouldPropose',
      'ourGroupPermissionsHas'
    ]),
    ...mapState([
      'currentGroupId'
    ]),
    invitesToShow () {
      const vmInvites = this.currentGroupState._vm?.invites
      if (!vmInvites) { return [] }

      const invites = this.currentGroupState.invites || {}

      const invitesList = Object.entries(vmInvites)
        .map(([id, invite]) => [id, { ...invite, creatorID: invites[id]?.creatorID, invitee: invites[id]?.invitee }])
        .filter(([, invite]) => {
          return invite.creatorID === INVITE_INITIAL_CREATOR ||
            invite.creatorID === this.ourIdentityContractId ||
            this.ourGroupPermissionsHas(GROUP_PERMISSIONS.REVOKE_INVITE)
        })
        .map(this.mapInvite)

      const options = {
        Active: () => invitesList.filter(invite => invite.status.isActive || (invite.status.isRevoked && invite.id === this.ephemeral.inviteRevokedNow)),
        All: () => invitesList
      }

      return options[this.ephemeral.selectbox.selectedOption]()
    },
    isUserGroupCreator () {
      return this.ourIdentityContractId === this.currentGroupOwnerID
    }
  },
  methods: {
    unfocusSelect () {
      this.$refs.select.blur()
    },
    copyInviteLink (inviteLink) {
      const copyToClipBoard = () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(inviteLink)
        } else {
          const inputAid = this.$refs.copyInput

          inputAid.value = inviteLink
          inputAid.select()

          this.$nextTick(() => {
            document.execCommand('copy')
            inputAid.blur()
          })
        }
      }

      if (navigator.share) {
        navigator.share({
          title: L('Your invite'),
          url: inviteLink
        }).catch((error) => {
          console.error('navigator.share failed with:', error)
          copyToClipBoard()
        })

        return
      }

      copyToClipBoard()
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
      if (expiryTime == null) return L("Doesn't expire")
      const { expired, years, months, days, hours, minutes } = timeLeft(expiryTime)
      if (expired) return L('Expired')

      // In the cases when displaying years/months, count the remainer hours/mins as +1 day eg) 3days 15hrs 25mins -> 4days.
      if (years) return L('{years}y {months}mo {days}d left', { years, months, days: days + ((hours || minutes) ? 1 : 0) })
      if (months) return L('{months}mo {days}d left', { months, days: days + ((hours || minutes) ? 1 : 0) })

      if (days) return L('{days}d {hours}h {minutes}m left', { days, hours, minutes })
      if (hours) return L('{hours}h {minutes}m left', { hours, minutes })
      if (minutes) return L('{minutes}m left', { minutes })

      return L('Expired')
    },
    mapInvite ([id, {
      creatorID,
      expires: expiryTime,
      invitee,
      inviteSecret,
      initialQuantity,
      quantity,
      status
    }]) {
      const isAnyoneLink = creatorID === INVITE_INITIAL_CREATOR
      const isInviteExpired = expiryTime < Date.now()
      const isInviteRevoked = status === INVITE_STATUS.REVOKED
      const numberOfResponses = initialQuantity - quantity
      const isAllInviteUsed = (quantity === 0)

      return {
        id,
        isAnyoneLink,
        invitee: isAnyoneLink ? L('Anyone') : invitee,
        inviteSecret,
        inviteLink: buildInvitationUrl(this.currentGroupId, this.currentGroupState.settings?.groupName, inviteSecret, isAnyoneLink ? undefined : this.ourIdentityContractId),
        description: this.inviteStatusDescription({
          isAnyoneLink, isInviteExpired, isInviteRevoked, isAllInviteUsed, quantity: initialQuantity, numberOfResponses
        }),
        expiryInfo: isInviteExpired ? L('Expired') : isInviteRevoked ? L('Revoked') : isAllInviteUsed ? '' : this.readableExpiryInfo(expiryTime),
        status: {
          isExpired: isInviteExpired,
          isActive: !isInviteExpired && !isInviteRevoked && !isAllInviteUsed,
          isRevoked: isInviteRevoked
        }
      }
    },
    showRevokeLinkMenu (inviteItem) {
      if (inviteItem.status.isActive) {
        if (inviteItem.isAnyoneLink) {
          // 'Anyone' link must only be revokable when the group size is >= 3 (context: https://github.com/okTurtles/group-income/issues/1670)
          return this.isUserGroupCreator && this.groupShouldPropose
        }
        return true
      }
      return false
    },
    handleInviteClick (e) {
      if (e.target.classList.contains('js-btnInvite')) {
        if (this.groupShouldPropose) {
          const contractID = this.currentGroupId
          sbp('gi.app/group/checkGroupSizeAndProposeMember', { contractID }).catch(e => {
            console.error(`Error on action checkGroupSizeAndProposeMember (handleInviteClock) for ${contractID}`, e)
          })
        } else {
          sbp('okTurtles.events/emit', OPEN_MODAL, 'InvitationLinkModal')
        }
      }
    },
    async handleSeeOriginal (/* { inviteSecret } */) {
      // TODO: Ricardo - please update this code so that it checks for inviteKeyId
      //       however, make sure that proposals actually have that on them
      //       (instead of, or in addition to, the inviteSecret).
      //       An alternative, is to grab the inviteSecret from currentGroupState.invites
      //       and on line 175 pass that in, and keep this code as-is
      //       Honestly this is fairly low priority because the proposal should be there
      //       and all this code ends up doing is bringing up the proposal modal anyway
      //       (instead of somehow linking directly to the proposal), so this is unnecessary
      //       complexity.
      await sbp('okTurtles.events/emit', OPEN_MODAL, 'PropositionsAllModal')
      /*
      const key = `proposals/${this.ourIdentityContractId}/${this.currentGroupId}`
      const archivedProposals = await sbp('gi.db/archive/load', key) || []
      const proposalItemExists = archivedProposals.length > 0 || archivedProposals.some(entry => {
        const { data, payload } = entry[1]

        return data.proposalType === PROPOSAL_INVITE_MEMBER &&
          payload.inviteSecret === inviteSecret
      })

      if (proposalItemExists) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'PropositionsAllModal')
      } else {
        alert(L('Unable to find the original proposal.'))
      }
      */
    },
    async handleRevokeClick (inviteKeyId) {
      const yesSelected = await sbp('gi.ui/prompt', {
        heading: L('Revoke invite link'),
        question: L('Are you sure you want to revoke this link?{br_}This action cannot be undone.', LTags()),
        primaryButton: L('Yes'),
        secondaryButton: L('Cancel')
      })

      if (!yesSelected) {
        return null
      }

      try {
        this.ephemeral.inviteRevokedNow = inviteKeyId
        await sbp('gi.actions/group/inviteRevoke', {
          data: { inviteKeyId },
          contractID: this.currentGroupId
        })
        setTimeout(() => {
          this.ephemeral.inviteRevokedNow = null
        }, 2000)
      } catch (e) {
        this.ephemeral.inviteRevokedNow = null
        console.error('InvitationsTable.vue handleRevokeClick() error:', e)
        this.$refs.inviteError.danger(e.message)
      }
    }
  },
  mounted () {
    this.matchMediaMobile = window.matchMedia('screen and (max-width: 769px)')
    this.ephemeral.isMobile = this.matchMediaMobile.matches
    this.matchMediaMobile.onchange = (e) => {
      this.ephemeral.isMobile = e.matches
    }
  },
  beforeDestroy () {
    this.matchMediaMobile.onchange = null
  }
}: Object)
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
      margin-left: $size_4 * 0.5;
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

    @include phone {
      justify-content: flex-end;
      padding-right: 0.5rem;

      &-wrapper {
        display: none;
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
  .c-dropdown-invite-link {
    width: max-content;
    transform: translateX(-100%);
  }

  .c-dropdown-action {
    min-width: 13.375rem;
    margin: 3.5rem 0 0 3rem;
  }

  .c-dropdown-invite-link {
    min-width: 8.5rem;
    margin-top: 2rem;
    right: unset;
    left: 2rem;
    top: 0.5rem;
  }

  .c-webshare-fallback {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 0.5rem;
    z-index: $zindex-tooltip;
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

.c-invisible-input {
  position: absolute;
  pointer-events: none;
  opacity: 0;
}
</style>
