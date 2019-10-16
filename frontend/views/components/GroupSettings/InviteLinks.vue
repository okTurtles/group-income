<template lang="pug">
page-section.c-section(:title='L("Invite links")')
  template(#cta='')
    button.button.is-small.is-outlined.c-active-button(
      @click='switchList'
    )
      | {{ ephemeral.activeOn? L('Active links') : L('All links') }}
      i.icon-angle-down.c-arrow

  p.c-invite-description
    i18n.has-text-1 Here's a list of all invite links you own

  table.table.c-table(v-if='activeList.length')
    thead
      tr
        i18n.name(tag='th') created for
        i18n.invite-link(tag='th') invite link
        i18n.state(tag='th') state
        th.action
    tbody
      tr(
        v-for='(item, index) in activeList'
        :key='index'
      )
        td.name
          | {{ item.name }}
          tooltip.c-name-tooltip(
            direction='top'
            :isTextCenter='true'
            :text='L("This invite link was only available during the onboarding period.")'
          )
            button.is-icon-small(v-if='item.name === "Anyone"')
              i.icon-info-circle
        td.invite-link
          span.link.has-ellipsis {{ item.inviteLink }}
          button.is-icon-small.has-background
            i.icon-copy.is-regular
        td.state
          div
            i18n.state-description {{ item.state.description }}
            i18n.state-expire(
              v-if='item.state.expireInfo'
              :class='item.state.isExpired ? "expired" : ""'
            ) {{ item.state.expireInfo }}
        td.action
          invite-action-button(:linkExpired='item.state.isExpired')
  .c-empty-list(v-else)
    SvgInvitation

  // TODO: figuring out using either i18n or L() for the tag below
  p.c-invite-footer
    | To generate a new link, you need to&nbsp;
    router-link.link(
      to='/invite'
    ) propose adding a new member
    |  to your group.
</template>

<script>
import PageSection from '@components/PageSection.vue'
import Tooltip from '@components/Tooltip.vue'
import SvgInvitation from '@svgs/invitation.svg'
import InviteActionButton from './InviteActionButton.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'InviteLinks',
  components: {
    PageSection,
    SvgInvitation,
    InviteActionButton,
    Tooltip
  },
  data () {
    return {
      ephemeral: {
        activeOn: true
      }
    }
  },
  computed: {
    activeList () {
      return this.ephemeral.activeOn ? this.list.filter(item => !item.state.isExpired) : this.list
    },
    ...mapGetters([
      'groupMembers'
    ])
  },
  mounted () {
    console.log('groupMembers(inviteLinks.vue): ', this.groupMembers)
  },
  methods: {
    switchList () {
      this.ephemeral.activeOn = !this.ephemeral.activeOn
    }
  },
  props: {
    list: {
      type: Array
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

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
      grid-template-columns: 81% 19%;
      grid-template-areas: "name action";
    }

    tbody tr {
      grid-template-columns: 81% 19%;
      grid-template-rows: 50% 50%;
      grid-template-areas:
        "name action"
        "state action";
    }
  }

  th, td {
    display: flex;
    align-items: center;
  }

  .name {
    grid-area: name;
    padding-right: $size-2;

    button {
      display: inline-block;
      color: $primary_0;
    }
  }

  .invite-link {
    grid-area: invite-link;
    padding-right: $size-2;

    button {
      padding: 0 $spacer / 3;
      width: 1.6875rem;
      height: 1.6875rem;
      font-weight: normal;
    }

    @include phone {
      display: none;
    }
  }

  .state {
    grid-area: state;
    padding-right: 3px;

    div {
      display: flex;
      flex-direction: column;

      .state-expire {
        line-height: $size-3;
        font-size: $size-5;
        color: $text-1;

        &.expired {
          color: $danger_0;
        }
      }

      @include phone {
        flex-direction: row;
      }
    }
  }

  th.state {
    @include phone {
      display: none;
    }
  }

  td.state .state-expire {
    @include phone {
      &::before {
        content: "\00b7";
        display: inline-block;
        color: $text_0;
        padding: 0 $spacer-xs;
      }
    }
  }

  .action {
    grid-area: action;
    display: flex;
    justify-content: center;
    align-items: center;

    button {
      margin: 0 auto;
    }

    @include tablet-only {
      display: none;
    }
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
</style>
