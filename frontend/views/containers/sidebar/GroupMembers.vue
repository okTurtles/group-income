<template lang="pug">
.c-group-members(data-test='groupMembers')
  .c-group-members-header
    i18n.title.is-4(tag='h4') Members

    button.button.is-small.is-outlined(
      data-test='inviteButton'
      @click='invite'
    )
      i.icon-plus
      i18n Add

  ul.c-group-list
    li.c-group-member(
      v-for='(member, username, index) in groupMembers'
      v-if="index < 10"
      :class='member.pending && "is-pending"'
      :key='username'
      data-test='member'
    )
      user-image(:username='username')

      .c-name.has-ellipsis(data-test='username')
        | {{ username }}

      i18n.pill.has-text-small(
        v-if='member.pending'
        data-test='pending'
      ) pending

      tooltip(
        v-if='member.pending'
        direction="bottom-end"
      )
        span.button.is-icon-small(
          data-test='pendingTooltip'
        )
          i.icon-question-circle
        template(slot='tooltip')
          i18n(
            tag='p'
            :args='{ username }'
          )
            | We are waiting for {username} to join the group by using their unique invite link.

      menu-parent(
        v-else
      )
        menu-trigger.is-icon-small
          i.icon-ellipsis-v

        // TODO later - be a drawer on mobile
        menu-content.c-actions-content
          ul
            menu-item(tag='router-link' to="/chat" itemid='hash-1' icon='comment')
              i18n Send Message
            menu-item(tag='button' itemid='hash-2' icon='times')
              i18n Remover member...

  i18n.link(
    tag='button'
    v-if="groupMembersCount > 0"
    :args='{ groupMembersCount }'
    @click="openModal('GroupMembersList')"
  ) See all {groupMembersCount} members
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import Tooltip from '@components/Tooltip.vue'
import UserImage from '@containers/UserImage.vue'
import { LOAD_MODAL } from '@utils/events.js'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/Menu/index.js'

export default {
  name: 'GroupMembers',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    Tooltip,
    UserImage
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    },
    openModal (modal) {
      sbp('okTurtles.events/emit', LOAD_MODAL, modal)
    }
  },
  computed: {
    ...mapGetters([
      'groupMembers',
      'groupMembersCount'
    ])
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-group-members {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  position: relative;
}

.c-group-members-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
}

.c-group-list {
  margin-bottom: $spacer-md + $spacer-sm;
}

.c-group-member {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 2rem;
  margin-top: 1rem;
}

.c-avatar {
  width: 2rem;
  height: 2rem;
  margin-bottom: 0;
}

.c-name {
  margin-right: auto;
  margin-left: 0.5rem;

  .is-pending & {
    color: $text_1;
  }
}

.c-actions-content.c-content {
  top: calc(100% + #{$spacer-sm});
  left: auto;
  min-width: 214px;
}

</style>
