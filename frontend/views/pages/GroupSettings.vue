<template lang='pug'>
page(pageTestName='dashboard' pageTestHeaderName='groupName' v-if='groupSettings.groupName')
  template(#title='') {{ L('Group Settings') }}
  template(#description='') {{ L('Changes to these settings will be visible to all group members') }}

  page-section(title='')

    form
      .field
        i18n.label(tag='label') Group name

        //- BUG: TODO: cannot bind directly to :value here, as any changes
        //- to groupSettings must be done via proposals and/or
        //- like it's done in UserProfile.vue
        input.input.is-large.is-primary(
          ref='name'
          type='text'
          name='groupName'
          :class='{ error: $v.form.groupName.$error }'
          :value='groupSettings.groupName'
          @input='update'
          @keyup.enter='next'
          data-test='groupName'
        )

      .field
        i18n.label(tag='label') Description

        textarea.textarea(
          name='sharedValues'
          ref='purpose'
          :placeholder='L("Group Purpose")'
          maxlength='500'
          :class='{ error: $v.form.sharedValues.$error }'
          :value='groupSettings.sharedValues'
          @input='update'
        )

      .field
        i18n.label(tag='label') Default currency
        .select-wrapper
          select(
            name='incomeCurrency'
            required=''
            :value='groupSettings.incomeCurrency'
            @input='update'
          )
            option(
              v-for='(symbol, code) in currencies'
              :value='code'
              :key='code'
            ) {{ symbol }}

        i18n(tag='p') This is the currency that will be displayed for every member of the group, across the platform.

      i18n.is-success(
        tag='button'
        ref='save'
        @click='save'
        :disabled='$v.form.$invalid'
        data-test='saveBtn'
      ) Save changes

  page-section(:title='L("Invite links")')
    p.c-invite-description
      i18n.has-text-1 Here's a list of all invite links you own
      button.button.is-small.is-outlined
        | Active links
        i.icon-angle-down

    table.table.c-table
      thead
        tr
          i18n.name(tag='th') created for
          i18n.invite-link(tag='th') invite link
          i18n.state(tag='th') state
          th.action
      tbody
        tr(
          v-for='(item, index) in ephemeral.dummyInviteList'
          :key='index'
        )
          td.name
            | {{ item.name }}
            button.is-icon-small(v-if='item.name === "Anyone"')
              i.icon-info-circle
          td.invite-link
            div
              span.link-url.has-ellipsis {{ item.inviteLink }}
              button.is-icon-small.has-background
                i.icon-copy.is-regular
          td.state
            div
              i18n.state-description {{ item.state.description }}
              i18n.state-expire(
                :class='item.state.expireInfo === "Expired"? "expired" : ""'
              ) {{ item.state.expireInfo }}
          td.action
            div
              button.is-icon
                i.icon-ellipsis-v

    // TODO: figuring out using either i18n or L() for the tag below
    p.c-invite-footer
      | To generate a new link, you need to&nbsp;
      span.link propose adding a new member
      |  to your group.

  page-section(:title='L("Leave Group")')
    i18n(tag='p' html='This means you will stop having access to the <b>group chat</b> (including direct messages to other group members) and <b>contributions</b>. Re-joining the group is possible, but requires other members to vote and reach an agreement.')

    i18n.is-danger.is-outlined(
      tag='button'
      ref='leave'
      @click='openProposal("LeaveGroupModal")'
      data-test='LeaveBtn'
    ) Leave group

  page-section(:title='L("Delete Group")')
    i18n(tag='p') This will delete all the data associated with this group permanently.

    i18n.is-danger.is-outlined(
      tag='button'
      ref='delete'
      @click='openProposal("DeleteGroup")'
      data-test='deleteBtn'
    ) Delete group
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import currencies from '@view-utils/currencies.js'

import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'

export default {
  name: 'GroupSettings',
  mixins: [validationMixin],
  components: {
    Page,
    PageSection
  },
  data () {
    return {
      currencies,
      ephemeral: {
        dummyInviteList: [
          {
            name: 'Felix Kubin',
            inviteLink: 'http://localhost:8000/app/join?groupId=21XWnNFz7RbNPKHUqAeSLLT1cNHnnCssmSw6dJeB1gfSSeZc7v&secret=4460',
            state: {
              description: 'Not used yet',
              expireInfo: '1d 2h 30m left'
            }
          },
          {
            name: 'Brian Eno',
            inviteLink: 'http://localhost:8000/app/join?groupId=21XWnNFz7RbNPKHUqAeSLLT1cNHnnCssmSw6dJeB1gfSSeZc7v&secret=4460',
            state: {
              description: 'Used',
              expireInfo: null
            }
          },
          {
            name: 'Carl Sagan',
            inviteLink: 'http://localhost:8000/app/join?groupId=21XWnNFz7RbNPKHUqAeSLLT1cNHnnCssmSw6dJeB1gfSSeZc7v&secret=4460',
            state: {
              description: 'Not used',
              expireInfo: 'Expired'
            }
          },
          {
            name: 'Anyone',
            inviteLink: 'http://localhost:8000/app/join?groupId=21XWnNFz7RbNPKHUqAeSLLT1cNHnnCssmSw6dJeB1gfSSeZc7v&secret=4460',
            state: {
              description: '10/60 used',
              expireInfo: 'Expired'
            }
          }
        ]
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    openProposal (component) {
      sbp('okTurtles.events/emit', OPEN_MODAL, component)
    },
    update (e) {
      // TODO update value
      console.log('Update', e)
    },
    save (e) {
      // TODO save form
      console.log('Save', e)
    }
  },
  validations: {
    form: {
      groupName: {
        required
      },
      sharedValues: {
        required
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-invite-description {
  display: flex;
  justify-content: space-between;
  margin-top: $spacer-sm 0;
}

.c-table {
  width: 100%;
  table-layout: fixed;
  margin: $size-2 0;

  .name {
    width: 147px;
    padding-right: $size-2;

    button {
      display: inline-block;
      color: $primary_0;
    }
  }
  .invite-link {
    width: 197px;
    padding-right: $size-2;

    > div {
      display: flex;
      align-items: center;
    }

    button {
      padding: 0 $spacer / 3;
      width: 1.6875rem;
      height: 1.6875rem;
      font-weight: normal;
    }
  }
  .state {
    width: 123px;
    padding-right: 3px;

    > div {
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
    }
  }
  .action {
    width: 60px;

    button {
      margin: 0 auto;
    }
  }
}
</style>
