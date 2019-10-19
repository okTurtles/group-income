<template lang="pug">
page-section.c-section(:title='L("Invite links")')
  template(#cta='')
    .select-wrapper.c-select-wrapper(:class='ephemeral.selectbox.focused ? "focused" : ""')
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
            direction='top'
            :isTextCenter='true'
            :text='L("This invite link was only available during the onboarding period.")'
          )
            button.is-icon-small(v-if='item.name === "Anyone"')
              i.icon-info-circle
        td.c-invite-link
          span.link.has-ellipsis {{ item.inviteLink }}
          button.is-icon-small.has-background
            i.icon-copy.is-regular
        td.c-state
          i18n.c-state-description {{ item.state.description }}
          i18n.c-state-expire(
            v-if='item.state.expireInfo'
            :class='item.state.isExpired ? "expired" : ""'
          ) {{ item.state.expireInfo }}
        td.c-action
          invite-action-button.c-invite-action-button(:linkExpired='item.state.isExpired')
  .c-empty-list(v-else)
    SvgInvitation

  // TODO: router-link doesn't work and it might be related to the fact that this p tag is the output result of i18n.vue component.
  // Discussion needed to solve the problem.
  i18n.c-invite-footer(
    tag='p'
    html='To generate a new link, you need to <router-link class="link" to="/invite">propose adding a new member</router-link> to your group.'
  )
</template>

<script>
import PageSection from '@components/PageSection.vue'
import Tooltip from '@components/Tooltip.vue'
import SvgInvitation from '@svgs/invitation.svg'
import InviteActionButton from './InviteActionButton.vue'

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
        selectbox: {
          focused: false,
          selectedOption: 'Active'
        }
      }
    }
  },
  methods: {
    unfocusSelect () {
      this.$refs.select.blur()
    }
  },
  computed: {
    activeList () {
      return this.ephemeral.selectbox.selectedOption === 'Active' ? this.list.filter(item => !item.state.isExpired)
        : this.ephemeral.selectbox.selectedOption === 'All' && this.list
    }
  },
  props: {
    list: {
      type: Array
      // TODO: leaving a comment explaining the structure of this prop.
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
      grid-template-columns: 81% auto;
      grid-template-areas: "name action";
    }

    tbody tr {
      grid-template-columns: 81% auto;
      grid-template-rows: 1fr 1fr;
      grid-template-areas:
        "name action"
        "state action";
    }
  }

  th, td {
    display: flex;
    align-items: center;
  }

  .c-name {
    grid-area: name;
    padding-right: $size-2;

    button {
      display: inline-block;
      color: $primary_0;
    }
  }

  .c-invite-link {
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

    &:focus + .c-rect {
      display: block;
    }
  }
}
</style>
