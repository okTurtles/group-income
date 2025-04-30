<template lang='pug'>
tooltip(
  ref='tooltip'
  :direction='direction'
  :manual='true'
  :opacity='1'
  :deactivated='deactivated'
  :isVisible='isVisible'
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
        avatar-user(:contractID='contractID' size='lg')
        user-name(:contractID='contractID')

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
        button-submit.is-outlined.is-small(
          type='button'
          data-test='buttonSendMessage'
          @click='sendMessage'
        )
          i18n Send message

        i18n.button.is-outlined.is-small(
          v-if='groupShouldPropose || isGroupCreator'
          tag='button'
          @click.stop='onRemoveMemberClick'
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
import ButtonSubmit from '@components/ButtonSubmit.vue'
import UserName from '@components/UserName.vue'
import Tooltip from '@components/Tooltip.vue'
import ModalClose from '@components/modal/ModalClose.vue'
import DMMixin from '@containers/chatroom/DMMixin.js'
import { OPEN_MODAL, REPLACE_MODAL } from '@utils/events.js'
import { mapGetters } from 'vuex'
import { PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'

export default ({
  name: 'ProfileCard',
  props: {
    contractID: String,
    direction: {
      type: String,
      validator: (value) => ['left', 'top-left', 'bottom'].includes(value),
      default: 'left'
    },
    deactivated: {
      type: Boolean,
      default: false
    },
    isVisible: Boolean
  },
  mixins: [
    DMMixin
  ],
  components: {
    AvatarUser,
    ModalClose,
    UserName,
    Tooltip,
    ButtonSubmit
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'currentGroupOwnerID',
      'globalProfile',
      'groupShouldPropose',
      'ourContributionSummary',
      'ourGroupDirectMessageFromUserIds',
      'ourIdentityContractId'
    ]),
    isSelf () {
      return this.contractID === this.ourIdentityContractId
    },
    isGroupCreator () {
      return this.ourIdentityContractId === this.currentGroupOwnerID
    },
    profile () {
      return this.globalProfile(this.contractID)
    },
    username () {
      return this.profile?.username || this.contractID
    },
    userGroupProfile () {
      return this.groupProfiles[this.contractID]
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
  },
  methods: {
    openModal (modal, props) {
      if (this.deactivated) { return }
      this.toggleTooltip()

      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
    },
    onRemoveMemberClick () {
      if (this.deactivated) { return }
      this.toggleTooltip()

      sbp(
        'okTurtles.events/emit',
        this.$route.query?.modal === 'GroupMembersAllModal' ? REPLACE_MODAL : OPEN_MODAL,
        'RemoveMember',
        { memberID: this.contractID }
      )
    },
    toggleTooltip () {
      this.$refs.tooltip?.toggle()
    },
    async sendMessage () {
      const chatRoomID = this.ourGroupDirectMessageFromUserIds(this.contractID)
      if (!chatRoomID) {
        const freshChatRoomID = await this.createDirectMessage(this.contractID)
        if (freshChatRoomID) {
          this.redirect(freshChatRoomID)
        }
      } else {
        if (!this.ourGroupDirectMessages[chatRoomID].visible) {
          this.setDMVisibility(chatRoomID, true)
        } else {
          this.redirect(chatRoomID)
        }
      }
      this.toggleTooltip()
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
  user-select: none;
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
