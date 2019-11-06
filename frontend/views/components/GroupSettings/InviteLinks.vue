<template lang="pug">
page-section.c-section(:title='L("Invite links")')
  template(#cta='')
    .select-wrapper.c-select-wrapper(:class='{ focus: ephemeral.selectbox.focused }')
      select.button.is-small.is-outlined.c-select(
        ref='select'
        v-model='ephemeral.selectbox.selectedOption'
        @change='unfocusSelect'
      )
        option(value='Active') {{ L('Active links') }}
        option(value='All') {{ L('All links') }}
      span.c-rect

  i18n.has-text-1.c-invite-description(tag='p') Here's a list of all invite links you own

  table.table.c-table(v-if='activeList.length')
    thead
      tr
        i18n.c-name(tag='th') created for
        i18n.c-invite-link(tag='th') invite link
        i18n.c-state(tag='th') state
        th.c-action(
          :aria-label='L("action")'
        )
    tbody
      tr(
        v-for='(item, index) in activeList'
        :key='index'
      )
        td.c-name
          | {{ item.name }}
          tooltip.c-name-tooltip(
            v-if='item.isAnyoneLink'
            direction='top'
            :isTextCenter='true'
            :text='L("This invite link was only available during the onboarding period.")'
          )
            .button.is-icon-smaller.is-primary.c-tip
              i.icon-info
        td.c-invite-link
          invite-link-to-copy.c-invite-link-wrapper(:inviteLink='item.inviteLink')
          button.is-icon-small.c-invite-link-button-mobile(
            @click='activateWebShare(item.inviteLink)'
            :aria-label='L("Copy link")'
          )
            i.icon-ellipsis-v
        td.c-state
          i18n.c-state-description {{ item.state.description }}
          i18n.c-state-expire(
            v-if='item.state.expireInfo'
            :class='item.state.isExpired ? "expired" : ""'
          ) {{ item.state.expireInfo }}
        td.c-action
          menu-parent
            menu-trigger.is-icon(:aria-label='L("Show list")')
              i.icon-ellipsis-v

            menu-content.c-action-dropdown
              ul
                menu-item(
                  tag='button'
                  item-id='original'
                  icon='vote-yea'
                )
                  i18n See original proposal
                menu-item(
                  v-if='!item.state.isExpired'
                  tag='button'
                  item-id='revoke'
                  icon='times'
                )
                  i18n Revoke Link

  .c-empty-list(v-else)
    SvgInvitation

  i18n.c-invite-footer(
    tag='p'
    :args='{ r1: "<router-link class=\'link\' to=\'/invite\'>", r2: "</router-link>"}'
    compile
  ) To generate a new link, you need to {r1}propose adding a new member{r2} to your group.
</template>

<script>
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/Menu/index.js'
import PageSection from '@components/PageSection.vue'
import Tooltip from '@components/Tooltip.vue'
import SvgInvitation from '@svgs/invitation.svg'
import InviteLinkToCopy from '@components/InviteLinkToCopy.vue'

export default {
  name: 'InviteLinks',
  components: {
    PageSection,
    SvgInvitation,
    Tooltip,
    InviteLinkToCopy,
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
        dummyInviteList: [
          {
            name: 'Felix Kubin',
            inviteLink: 'http://localhost:8000/app/join?groupId=21XWnNFz7RbNPKHUqAeSLLT1cNHnnCssmSw6dJeB1gfSSeZc7v&secret=4460',
            isAnyoneLink: false,
            state: {
              description: 'Not used yet',
              expireInfo: '1d 2h 30m left',
              isExpired: false
            }
          },
          {
            name: 'Brian Eno',
            inviteLink: 'http://localhost:8000/app/join?groupId=30aFnTYz7RbqAeSLLT1cNfSSeZHN6KHUnnCssmSw6dJeB1gc7v&secret=2250',
            isAnyoneLink: false,
            state: {
              description: 'Used',
              expireInfo: '',
              isExpired: true
            }
          },
          {
            name: 'Carl Sagan',
            inviteLink: 'http://localhost:8000/app/join?groupId=B1gfSSeZc721XWnNFz7RbkoyHUqAeSwLT1cNHnnCssmSw6dJev&secret=1348',
            isAnyoneLink: false,
            state: {
              description: 'Not used',
              expireInfo: 'Expired',
              isExpired: true
            }
          },
          {
            name: 'Anyone',
            inviteLink: 'http://localhost:8000/app/join?groupId=s8LT1cNHnnCs21XWnNFz7RbNPKHUqAesmSw6dJeB1gfSSeZc7v&secret=5521',
            isAnyoneLink: true,
            state: {
              description: '10/60 used',
              expireInfo: 'Expired',
              isExpired: true
            }
          }
        ]
      }
    }
  },
  methods: {
    unfocusSelect () {
      this.$refs.select.blur()
    },
    toInvite (e) {
      if (e.target.tagName === 'SPAN') this.$router.push({ path: '/invite' })
    },
    activateWebShare (inviteLink) {
      if (navigator.share) {
        navigator.share({
          title: this.L('Your invite'),
          url: inviteLink
        })
      }
    }
  },
  computed: {
    activeList () {
      return this.ephemeral.selectbox.selectedOption === 'Active' ? this.ephemeral.dummyInviteList.filter(item => !item.state.isExpired)
        : this.ephemeral.selectbox.selectedOption === 'All' && this.ephemeral.dummyInviteList
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
  margin: $spacer-sm 0;
}

.c-table {
  width: 100%;
  table-layout: fixed;
  margin: $size-2 0;

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

  th, td {
    display: flex;
    align-items: center;
  }

  .c-name {
    grid-area: name;
    padding-right: $size-2;
    line-height: 1.3125rem;
    align-items: center;

    .c-tip {
      margin-left: $size-4 / 2;
      line-height: 1.3125rem;
    }
  }

  .c-invite-link {
    grid-area: invite-link;
    padding-right: $size-2;

    &-wrapper {
      display: inherit;
      align-items: inherit;
      width: 100%;

      ::v-deep .c-copy-button {
        flex-shrink: 0;
        font-weight: normal;
      }
    }

    .c-invite-link-button-mobile {
      display: none;
    }

    @include phone {
      justify-content: flex-end;
      padding-right: $spacer-sm;

      &-wrapper {
        display: none;
      }

      .c-invite-link-button-mobile {
        display: inline-block;
      }
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
      line-height: $size-3;
      font-size: $size-5;
      color: $text-1;

      &.expired {
        color: $danger_0;
      }
    }

    @include phone {
      flex-direction: row;
      align-items: baseline;
      justify-content: flex-start;
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
        padding: 0 $spacer-xs;
      }
    }
  }

  .c-action {
    grid-area: action;
    justify-content: flex-end;

    .c-invite-action-button {
      margin-right: $spacer-sm;
    }

    @include until($tablet) {
      display: none;
    }
  }

  .c-action-dropdown {
    min-width: 13.375rem;
    width: max-content;
    margin: 3.5 * $spacer 0 0 3 * $spacer;
    transform: translateX(-100%);
  }
}

.c-empty-list {
  margin: $size-2 0;
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

.c-select-wrapper {
  position: relative;
  border: none;
  width: max-content;

  &::after {
    font-size: $size-5;
  }

  .c-rect {
    position: absolute;
    bottom: 0;
    left: 0;
    display: none;
    width: 100%;
    height: 32%;
    background-color: $white;
    z-index: 2;
    border: {
      left: 1px solid $text_0;
      right: 1px solid $text_0;
    }

    box-shadow: 0 2px 0 2px $primary_1;
  }

  .c-select {
    text-align: left;
    border-radius: 0.7rem;
    font-family: 'Poppins';
    letter-spacing: 0.1px;
    display: block;
    padding-right: 1.7rem;

    &:focus + .c-rect {
      display: block;
    }
  }
}
</style>
