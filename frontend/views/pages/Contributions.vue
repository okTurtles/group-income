<template lang='pug'>
page(pageTestName='contributionsPage' pageTestHeaderName='contributionsTitle')
  template(#title='') {{ L('Contributions') }}

  callout-card(
    :isCard='true'
    :title='L("Add your income details")'
    :svg='SvgContributions'
    v-if='memberProfile(ourUsername).groupProfile.incomeDetailsKey'
  )
    i18n(tag='p') This will allow you to start receiving or giving mincome.
    i18n(tag='button' @click='openModal("IncomeDetails")') Add income details

  template(v-else)
    .c-contribution-header
      .has-text-1
        i18n(
          v-if='needsIncome'
          tag='p'
          :args='{upTo: upTo,bold_:\'<span class="has-text-bold has-text-0">\',_bold:\'</span>\'}'
        ) You need {bold_}{upTo}{_bold}
        i18n(
          v-else
          tag='p'
          :args='{upTo: upTo,bold_:\'<span class="has-text-bold has-text-0">\',_bold:\'</span>\'}'
        ) You are pledging up to {bold_}{upTo}{_bold}

        i18n(
          tag='p'
          :args='{bold_:\'<span class="has-text-bold has-text-0">\',_bold:\'</span>\',paymentMethod:paymentMethod}'
        ) Payment method {bold_}{paymentMethod}{_bold}

      div
        button.button.is-small(
          @click='openModal("IncomeDetails")'
        ) Change

    section.card.contribution-card
      .receiving
        i18n(tag='h3' class='card-header') Receiving

        i18n.has-text-1.spacer-around(
          v-if='!doesReceive'
          tag='p'
        ) When other members pledge a monetary or non-monetary contribution, they will appear here.

        i18n.has-text-1.spacer-around(
          v-else-if='!needsIncome'
          tag='p'
        ) No one is pledging money at the moment.

        ul.spacer(v-if='doesReceive')
          contribution(
            v-if='needsIncome'
          )
            contribution-item(
              :what='upTo'
              :who='fakeStore.groupMembersPledging'
              type='MONETARY'
            )

          contribution(
            v-for='(contribution, index) in fakeStore.receiving.nonMonetary'
            :key='`contribution-${index}`'
          )
            contribution-item(
              :what='contribution.what'
              :who='contribution.who'
              type='NON_MONETARY'
            )

        button.button.is-small(
          v-if='groupMembersCount === 0'
          @click='openModal("InviteByLink")'
        )
          i.icon-plus
          i18n Add members to group

      .giving
        i18n(tag='h3' class='card-header') Giving

        i18n.has-text-1.spacer-around(
          v-if='!doesGive'
          tag='p'
        ) You can contribute to your group with money or other valuables like teaching skills, sharing your time ot help someone. The sky is the limit!

        i18n.has-text-1.spacer-around(
          v-else-if='!fakeStore.giving.monetary'
          tag='p'
        ) No one needs monetary contributions at the moment.

        ul(v-if='doesGive')
          contribution(
            v-if='fakeStore.giving.monetary'
          )
            contribution-item(
              :what='fakeStore.currency + fakeStore.giving.monetary'
              :who='fakeStore.groupMembersPledging'
              type='MONETARY'
              action='GIVING'
            )

          contribution.has-text-weight-bold(
            v-for='(contribution, index) in fakeStore.giving.nonMonetary'
            :key='`contribution-${index}`'
            variant='editable'
            :initial-value='contribution'
            @new-value='(value) => handleEditNonMonetary(value, index)'
          )
            contribution-item(
              :what='contribution'
              type='NON_MONETARY'
              action='GIVING'
            )

          contribution(
            variant='unfilled'
            @new-value='submitAddNonMonetary'
          )
            i.icon-plus(aria-hidden='true')
            i18n Add a non-monetary pledge
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import CalloutCard from '@components/CalloutCard.vue'
import SvgContributions from '@svgs/contributions.svg'
import Page from '@pages/Page.vue'
import PageSection from '@components/PageSection.vue'
import currencies from '@view-utils/currencies.js'
import GroupMincome from '@containers/sidebar/GroupMincome.vue'
import Contribution from '@components/Contribution.vue'
import ContributionItem from '@components/ContributionItem.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'Contributions',
  components: {
    Page,
    PageSection,
    CalloutCard,
    GroupMincome,
    Contribution,
    ContributionItem,
    SvgContributions
  },
  data () {
    return {
      SvgContributions,
      form: {
        incomeDetailsType: 'incomeAmount',
        incomeAmount: 0,
        pledgeAmount: 0
      },
      ephemeral: {
        isEditingIncome: false,
        isActive: true
      },
      paymentMethod: 'Manual', // static
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        currency: currencies.USD.symbol, // group (getter)
        receiving: { // ?
          nonMonetary: [
            {
              what: 'Cooking',
              who: 'Lilia Bouvet'
            },
            {
              what: 'Cuteness',
              who: ['Zoe Kim', 'Laurence E']
            }
          ],
          monetary: 100
        },
        giving: { // ?
          nonMonetary: [
            'Happiness'
          ],
          monetary: 20
        },
        groupMembersPledging: [ // group
          'Jack Fisher',
          'Charlotte Doherty',
          'Thomas Baker',
          'Francisco Scott'
        ]
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupMembersCount',
      'groupSettings',
      'currentGroupState',
      'memberProfile',
      'memberGroupProfile',
      'groupMincomeFormatted',
      'ourUsername'
    ]),
    upTo () {
      const amount = this.memberGroupProfile[this.memberGroupProfile.incomeDetailsType]
      return this.formatMincome(this.needsIncome ? this.groupSettings.mincomeAmount - amount : amount)
    },
    needsIncome () {
      return this.memberGroupProfile.incomeDetailsType === 'incomeAmount'
    },
    doesReceive () {
      return this.needsIncome || this.fakeStore.receiving.nonMonetary
    },
    doesGive () {
      return this.fakeStore.giving.monetary || this.fakeStore.giving.nonMonetary
    }
  },
  beforeMount () {
    const profile = this.memberProfile(this.ourUsername) || {}
    const incomeDetailsType = profile.groupProfile && profile.groupProfile.incomeDetailsType
    if (incomeDetailsType) {
      this.form.incomeDetailsType = incomeDetailsType
      this.form[incomeDetailsType] = profile.groupProfile[incomeDetailsType]
    }

    console.log('plop', this.memberGroupProfile, this.currentGroupState)
  },
  methods: {
    openModal (modal) {
      sbp('okTurtles.events/emit', OPEN_MODAL, modal)
    },
    async setPaymentInfo () {
      if (this.$v.form.$invalid) {
        alert(L('Invalid payment info'))
        return
      }
      try {
        const incomeDetailsType = this.form.incomeDetailsType
        const groupProfileUpdate = await sbp('gi.contracts/group/groupProfileUpdate/create',
          {
            incomeDetailsType,
            [incomeDetailsType]: +this.form[incomeDetailsType]
          },
          this.$store.state.currentGroupId
        )
        await sbp('backend/publishLogEntry', groupProfileUpdate)
      } catch (e) {
        console.error('setPaymentInfo', e)
        alert(`Failed to update user's profile. Error: ${e.message}`)
      }
    },
    submitAddNonMonetary (value) {
      console.log('TODO $store - submitAddNonMonetary')
      this.fakeStore.giving.nonMonetary.push(value) // Hardcoded Solution
    },
    handleEditNonMonetary (value, index) {
      if (!value) {
        console.log('TODO $store - deleteNonMonetary')
        this.fakeStore.giving.nonMonetary.splice(index, 1) // Hardcoded Solution
      } else {
        console.log('TODO $store - editNonMonetary')
        this.$set(this.fakeStore.giving.nonMonetary, index, value) // Hardcoded Solution
      }
    },
    formatIncome () {
      return currencies[this.groupSettings.mincomeCurrency].displayWithCurrency
    }
  }
}
</script>

<style lang="scss">
@import "../../assets/style/_variables.scss";
.c-contribution-header .has-text-bold {
  font-family: "Poppins";
  padding-left: $spacer-sm;
}
</style>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
.c-contribution-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem 0 1.5rem 0;

  button {
    margin-top: -0.25rem;
  }

  @include tablet {
    padding-top: 0;

    p {
      float: left;
      margin-right: 1.5rem;
    }
  }
}

.contribution-card {

  @include tablet {
    display: flex;
    justify-content: space-between;

    > div {
      width: calc(50% - 1rem);
    }
  }
}

.spacer-around {
  margin: 0 0 1rem 0;

  @include tablet {
    margin: $spacer 0;
  }
}

.spacer {
  margin-bottom: $spacer * 2.5;

  @include tablet {
    margin-bottom: $spacer * 1;
  }
}
.c-card-empty {
  display: flex;

  .c-svg {
    width: 4rem;
    height: 4rem;
    margin-right: $spacer;
    flex-shrink: 0;

    @include widescreen {
      width: 6.25rem;
      height: 6.25rem;
      margin-right: 2.5rem;
    }
  }
}
</style>
