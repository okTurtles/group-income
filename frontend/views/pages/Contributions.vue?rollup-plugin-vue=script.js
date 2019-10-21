//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
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
    GroupMincome,
    Contribution,
    ContributionItem,
    SvgContributions
  },
  data () {
    return {
      form: {
        incomeDetailsType: 'incomeAmount',
        incomeAmount: 0,
        pledgeAmount: 0
      },
      ephemeral: {
        isEditingIncome: false,
        isActive: true
      },
      // -- Hardcoded Data just for layout purposes:
      fakeStore: {
        paymentMethod: 'Manual', // static
        currency: currencies.USD.symbol, // group (getter)
        mincome: 500, // group
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
      if (this.needsIncome) {
        return this.groupSettings.mincomeAmount - this.memberGroupProfile[this.memberGroupProfile.incomeDetailsType]
      } else {
        return this.memberGroupProfile[this.memberGroupProfile.incomeDetailsType]
      }
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
    }
  }
}
