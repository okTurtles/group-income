<template lang='pug'>
tooltip(
  :direction='direction'
  :manual='true'
  ref='tooltip'
  :opacity='1'
)
  slot

  template(slot='tooltip')
    .card.c-profile(v-if='profile')
      .c-identity(:class='{notGroupMember: !isActiveGroupMember}')
        avatar-user(:username='username' size='lg')
        user-name(:username='username')

      i18n.has-text-1(
        tag='p'
        v-if='!isActiveGroupMember'
      ) No longer a member of the group

      p.c-bio(v-if='profile.bio')
        | {{profile.bio}}
        i18n.c-bio-link.is-unstyled.link(
          tag='button'
          @click='openModal("UserSettingsModal")'
          data-test='linkEditBio'
        ) Edit Bio

      i18n.button.is-small.is-outlined.c-bio-button(
        v-else-if='isSelf'
        tag='button'
        @click='openModal("UserSettingsModal")'
        data-test='buttonEditBio'
      ) Add a bio

      div(v-if='hasIncomeDetails')
        ul.c-payment-list
          li.c-payment-item(v-for='payment in fakeStore.paymentMethods')
            span.c-payment-type.has-text-0.has-text-bold {{payment.name}}
            span.has-text-1 {{payment.address}}

        i18n.is-unstyled.link(
          v-if='isSelf && receivingMonetary'
          tag='button'
          @click='openModal("incomeDetails")'
          data-test='linkEditPayment'
        ) Edit payment info

      .c-add-payment(v-else-if='isSelf')
        i18n.has-text-1(tag='p') Help other users send monthly contributions your way by adding your payment information.
        i18n.button.c-add-payment-button(
          tag='button'
          @click='openModal("incomeDetails")'
          data-test='buttonAddPayment'
        ) Add payment information

      .buttons(v-if='!isSelf')
        i18n.button.is-outlined.is-small(
          tag='button'
          @click='sendMessage'
        ) Send message

        i18n.button.is-outlined.is-small(
          tag='button'
          @click='removeMember'
        ) Remove member
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import UserName from '@components/UserName.vue'
import Tooltip from '@components/Tooltip.vue'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'

export default {
  name: 'ProfileCard',
  props: {
    username: String,
    isSelf: {
      type: Boolean,
      default: false
    },
    direction: {
      type: String,
      validator: (value) => ['left', 'top-left'].includes(value),
      default: 'left'
    }
  },
  components: {
    AvatarUser,
    UserName,
    Tooltip
  },
  data () {
    return {
      // Temp
      fakeStore: {
        paymentMethods: [{
          name: 'Paypal',
          address: 'maggie@mail.com'
        }, {
          name: 'Bitcoin',
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
        }, {
          name: 'Venmo',
          address: '@maggieb'
        }, {
          name: 'MBWAY',
          address: '+351913000330'
        }]
      }
    }
  },
  methods: {
    openModal (modal, props) {
      this.$refs.tooltip.toggle()
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    sendMessage () {
      console.log('To do: implement send message')
    },
    removeMember () {
      console.log('To do: implement remove member')
    },
    hasIncomeDetails () {
      return !!this.ourGroupProfile.incomeDetailsType
    },
    receivingMonetary () {
      return this.ourContributionSummary.receivingMonetary
    }
  },
  watch: {},
  computed: {
    ...mapGetters([
      'ourUsername',
      'ourGroupProfile',
      'groupSettings',
      'groupMembersCount',
      'groupProfile',
      'groupProfiles',
      'groupMincomeFormatted',
      'globalProfile',
      'ourContributionSummary'
    ]),
    profile () {
      return this.$store.getters.globalProfile(this.username)
    },
    isActiveGroupMember () {
      return true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card {
  padding: 1rem 1.5rem;
  color: $text_1;
  max-width: 100vw;
  width: 24.3rem;

  @include phone {
    box-shadow: none;
    width: 100vw;
    padding-bottom: 4rem;
  }
}

.c-profile {
  position: absolute;
  display: flex;
  flex-direction: column;
}

.c-identity {
  display: flex;
  align-items: center;
  padding-bottom: 1.5rem;
}

.notGroupMember {
  filter: saturate(0.3);
}

.c-bio-button {
  width: 100%;
  margin-bottom: 0.5rem;
}

.c-bio-link {
  margin-left: 0.3rem;
}

.c-payment-list {
  margin-top: 1rem;
}

.c-payment-item {
  margin-bottom: 0.5rem;
}

.c-payment-type {
  padding-right: 0.5rem;
}

.c-add-payment-button {
  margin-top: 1.5rem;
  width: 100%;
}

.c-bio + .c-add-payment {
  margin-top: 2rem;
}

.c-twrapper {
  display: flex;
  align-items: center;

  &:focus {
    outline: none;
  }
}

.buttons {
  margin-top: 1rem;

  .is-outlined {
    width: calc(50% - 0.5rem);
  }
}
</style>
