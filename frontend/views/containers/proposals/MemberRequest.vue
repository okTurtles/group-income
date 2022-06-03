<template lang='pug'>
  callout-card(
    v-if='!hasMemberRequest'
    :title='L("Member Requests")'
    :svg='SvgConversation'
    :isCard='true'
  )

    i18n(tag='p') In Group Income, you can use an invitation link to add members to the group and invite up to 60 people. Once someone uses that link to join the group, they’ll need to be approved by a member of the group with member approval permissions.
    i18n.has-text-1(tag='p') There are no open requests right now.

    i18n.c-all-requests.button.is-outlined.is-small(
      tag='span'
      @click='toggleHistory'
    ) See all requests

  // TODO: view without current requests
  // TODO: button "see all requests"
  page-section(
    v-else
    :title='L("Member Requests")'
  )
    .c-all-actions
      i18n.button.is-outlined.is-small(
        tag='span'
        @click='approveAll'
      ) Approve All
      i18n.button.is-outlined.is-small(
        tag='span'
        @click='rejectAll'
      ) Reject All

    ul.c-group-list
      li.c-group-member(
        v-for='{username, displayName, status, date} in requestsSorted'
        :data-test='`request-${username}`'
        :key='username'
      )
        profile-card(:username='username')
          avatar-user(:username='username' size='sm')
          .c-name.has-text-bold {{username}}
          .c-date.has-text-1 {{ humanDate(date, { month: 'long', day: 'numeric', year: 'numeric' }) }}
          .c-action-container(v-if='status === "requested"')
            i18n.button.is-outlined.is-small(
              tag='span'
              @click='approve'
            ) Approve
            i18n.button.is-outlined.is-small(
              tag='span'
              @click='reject'
            ) Reject
          .c-action-container.c-undo-container(v-else)
            .has-text-danger(v-if='status === "rejected"')
              i.icon-times
              i18n(
                tag='span'
              ) Request Rejected.

            .has-text-success(v-else)
              i.icon-check
              i18n(
                tag='span'
              ) Request Approved.

            i18n.is-link-inherit.has-text-1(
              tag='span'
              @click='undo'
            ) Undo

</template>

<script>
import { mapGetters } from 'vuex'
import SvgConversation from '@svgs/conversation.svg'
import CalloutCard from '@components/CalloutCard.vue'
import ProposalBox from '@containers/proposals/ProposalBox.vue'
import PageSection from '@components/PageSection.vue'
import Avatar from '@components/Avatar.vue'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import { humanDate } from '@model/contracts/shared/time.js'

export default {
  name: 'MemberRequest',
  components: {
    ProposalBox,
    CalloutCard,
    SvgConversation,
    PageSection,
    Avatar,
    AvatarUser,
    ProfileCard
  },
  data () {
    return {
      SvgConversation,
      requestsSorted: [
        {
          username: 'Pierre',
          date: new Date().toISOString(),
          displayName: 'Pierre',
          status: 'requested'
        },
        {
          username: 'Pierre',
          date: new Date().toISOString(),
          displayName: 'Pierre',
          status: 'rejected'
        },
        {
          username: 'Greg',
          date: new Date().toISOString(),
          displayName: 'Greg',
          status: 'approuved'
        }
      ]
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUserIdentityContract'
    ]),
    hasMemberRequest () {
      return this.requests
    },
    requests () {
      if (this.requestsSorted) {
        return this.requestsSorted
      }
      return []
    }
  },
  methods: {
    humanDate,
    approve (request) {
      return true
    },
    reject (request) {
      return true
    },
    approveAll () {
      return true
    },
    rejectAll () {
      return true
    },
    undo () {
      return true
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card {
  position: relative;
}

.c-all-requests {
  position: absolute;
  right: 2.5rem;
  top: 1rem;
}

.c-all-actions {
  margin-top: 1.5rem;

  @include tablet {
    position: absolute;
    right: 2.5rem;
    top: 1rem;
  }
}

.c-calloutCard p + .has-text-1 {
  margin-top: 1rem;
}

.c-action-container {
  margin-top: 0.5rem;

  @include tablet {
    margin-left: auto;
    margin-top: 0;
  }
}

.button + .button {
  margin-left: 1rem;
}

.c-name {
  margin: 0 1rem;
}

.c-group-members {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  position: relative;
}

.c-group-members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.c-group-list {
  margin-bottom: 1.5rem;
  margin-top: 1.5rem;
}

.c-group-member {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 4.625rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid $general_0;

  &:first-child {
    border-top: 1px solid $general_0;
  }

  > .c-twrapper {
    width: 100%;
    flex-wrap: wrap;
  }
}

.c-avatar {
  width: 2rem;
  height: 2rem;
  margin-bottom: 0;
}

.c-undo-container {
  display: flex;

  & > div {
    min-width: 9rem;
  }

  span,
  i {
    margin-left: 0.5rem;
  }
}
</style>
