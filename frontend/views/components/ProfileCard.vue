<template lang='pug'>
tooltip(
  :direction='direction'
  :manual='true'
  ref='tooltip'
  :opacity='1'
  :aria-label='L("Show profile")'
)
  slot

  template(slot='tooltip')
    .card.c-profile(
      v-if='profile'
      role='dialog'
      data-test='memberProfileCard'
      :aria-label='L("{username} profile", { username })'
    )
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
          v-if='isSelf'
          tag='button'
          @click='openModal("UserSettingsModal")'
          data-test='linkEditBio'
        ) Edit bio

      i18n.button.is-small.is-outlined.c-bio-button(
        v-else-if='isSelf && hasIncomeDetails'
        tag='button'
        @click='openModal("UserSettingsModal")'
        data-test='buttonEditBio'
      ) Add a bio

      div(v-if='hasIncomeDetails' data-test='profilePaymentMethods')
        ul.c-payment-list
          li.c-payment-item(v-for='(paymentMethod, name) in this.paymentMethods' data-test='profilePaymentMethod')
            span.c-payment-type.has-text-0.has-text-bold {{paymentMethod.name}}
            span.has-text-1 {{paymentMethod.value}}

        i18n.link(
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
          data-test='buttonSendMessage'
        ) Send message

        i18n.button.is-outlined.is-small(
          v-if='groupShouldPropose || ourUsername === groupSettings.groupCreator'
          tag='button'
          @click='openModal("RemoveMember", { username })'
          data-test='buttonRemoveMember'
        ) Remove member

      modal-close.c-close(
        :aria-label='L("Close profile")'
        @close='toggleTooltip'
      )
</template>

<script>
import sbp from '@sbp/sbp'
import AvatarUser from '@components/AvatarUser.vue'
import UserName from '@components/UserName.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalClose from '@components/modal/ModalClose.vue'
import { OPEN_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'
import { PROFILE_STATUS } from '~/frontend/model/contracts/constants.js'

export default ({
  name: 'ProfileCard',
  props: {
    username: String,
    direction: {
      type: String,
      validator: (value) => ['left', 'top-left'].includes(value),
      default: 'left'
    }
  },
  components: {
    AvatarUser,
    ModalClose,
    UserName,
    Tooltip
  },
  methods: {
    openModal (modal, props) {
      this.toggleTooltip()
      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    toggleTooltip () {
      this.$refs.tooltip.toggle()
    },
    sendMessage () {
      console.log('To do: implement send message')
    }
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'groupProfile',
      'groupProfiles',
      'groupSettings',
      'globalProfile',
      'groupShouldPropose',
      'ourContributionSummary'
    ]),
    isSelf () {
      return this.username === this.ourUsername
    },
    profile () {
      return this.$store.getters.globalProfile(this.username)
    },
    userGroupProfile () {
      return this.groupProfiles[this.username]
    },
    isActiveGroupMember () {
      return this.userGroupProfile?.status === PROFILE_STATUS.ACTIVE
    },

    paymentMethods () {
      return this.userGroupProfile?.paymentMethods
    },

    hasIncomeDetails () {
      return !!this.userGroupProfile?.incomeDetailsType
    },

    receivingMonetary () {
      return !!this.ourContributionSummary.receivingMonetary
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  color: $text_1;
  max-width: 100vw;
  width: 24.3rem;
  box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);

  &:last-child {
    margin-bottom: 0;
  }

  @include phone {
    box-shadow: none;
    width: 100vw;
    padding-bottom: 4rem;
  }
}

.c-profile {
  position: relative;
  display: flex;
  flex-direction: column;
}

.is-active .c-profile {
  animation: zoom 100ms both cubic-bezier(0.165, 0.84, 0.44, 1);
  @include phone {
    animation-name: enterFromBottom;
  }
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

.c-close {
  left: calc(100vw - 4rem);
  top: 1.5rem;
  @include tablet {
    left: auto;
    right: 1rem;

    /* Hide it visually... */
    opacity: 0;
    pointer-events: none;

    /* ...but keep it for keyboard users. */
    &:focus {
      opacity: 1;
    }
  }
}
</style>
