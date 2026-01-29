<template lang='pug'>
.card.c-profile(
  role='dialog'
  data-test='memberProfileCard'
  :aria-label='L("{username} profile", { username })'
)
  .c-identity(:class='{ "not-group-member": !isActiveGroupMember }')
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
      @click='toMyProfile'
      data-test='linkEditBio'
    ) Edit bio

  i18n.button.is-small.is-outlined.c-bio-button(
    v-else-if='isSelf && hasIncomeDetails'
    tag='button'
    @click='toMyProfile'
    data-test='buttonEditBio'
  ) Add a bio

  div(v-if='hasIncomeDetails' data-test='profilePaymentMethods')
    ul.c-payment-list
      li.c-payment-item(v-for='(paymentMethod, name) in paymentMethods'
        data-test='profilePaymentMethod')
        span.c-payment-type.has-text-0.has-text-bold {{ paymentMethod.name }}
        span.has-text-1 {{ paymentMethod.value }}

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
    @close='$emit("modal-close")'
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
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { mapGetters } from 'vuex'
import { PROFILE_STATUS } from '~/frontend/model/contracts/shared/constants.js'

export default {
  name: 'ProfileCardContent',
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
  props: {
    contractID: String,
    onPostCtaClick: Function,
    deactivated: {
      type: Boolean,
      default: false
    }
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
    profile () {
      return this.globalProfile(this.contractID)
    },
    userGroupProfile () {
      return this.groupProfiles[this.contractID]
    },
    isSelf () {
      return this.contractID === this.ourIdentityContractId
    },
    username () {
      return this.profile?.username || this.contractID
    },
    isGroupCreator () {
      return this.ourIdentityContractId === this.currentGroupOwnerID
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

      sbp('okTurtles.events/emit', OPEN_MODAL, modal, props)
      this.onPostCtaClick && this.onPostCtaClick()
    },
    toMyProfile () {
      if (this.deactivated) { return }

      this.$router.push({ path: '/user-settings/my-profile' }).catch(logExceptNavigationDuplicated)
      this.onPostCtaClick && this.onPostCtaClick()
    },
    onRemoveMemberClick () {
      if (this.deactivated) { return }

      sbp(
        'okTurtles.events/emit',
        this.$route.query?.modal === 'GroupMembersAllModal' ? REPLACE_MODAL : OPEN_MODAL,
        'RemoveMember',
        { memberID: this.contractID }
      )

      this.onPostCtaClick && this.onPostCtaClick()
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

      this.onPostCtaClick && this.onPostCtaClick()
    }
  }
}
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

  .is-active & {
    animation: zoom 100ms both cubic-bezier(0.165, 0.84, 0.44, 1);
    @include phone {
      animation-name: enterFromBottom;
    }
  }
}

.c-identity {
  display: flex;
  align-items: center;
  padding-bottom: 1.5rem;
}

.not-group-member {
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

.buttons {
  margin-top: 1rem;

  .is-outlined {
    width: calc(50% - 0.5rem);
  }
}

.c-close {
  position: absolute;
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
