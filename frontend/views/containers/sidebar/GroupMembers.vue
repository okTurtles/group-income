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
      v-for='(member, username, index) in profiles'
      v-if="index < 10"
      :class='member.pending && "is-pending"'
      :key='username'
      data-test='member'
    )
      user-image(:username='username')
        //- span.tag(v-if='member.pledge')
        //-   | {{ member.pledge }}

      .c-name(data-test='username')
        | {{ username }}

      i18n.pill.has-text-small(
        v-if='member.pending'
        data-test='pending'
      ) pending

      tooltip(
        v-if='member.pending'
        direction="bottom-end"
      )
        span.button.is-icon(
          data-test='pendingTooltip'
        )
          i.icon-question-circle
        template(slot='tooltip')
          i18n(tag='p')
            | Voting proposal in progress

      menu-parent(
        v-else
      )
        menu-trigger.is-icon
          i.icon-ellipsis-v

        // TODO later - be a drawer on mobile
        menu-content.c-actions-content
          ul
            menu-item(tag='button' itemid='hash-1' icon='heart')
              i18n Option 1
            menu-item(tag='button' itemid='hash-2' icon='heart')
              i18n Option 2
            menu-item(tag='button' itemid='hash-3' icon='heart')
              i18n Option 3

  i18n.link(
    tag='button'
    v-if="profilesCount > 10"
    :args='{ profilesCount }'
  ) See all {profilesCount} members
</template>

<script>
import Tooltip from '@components/Tooltip.vue'
import UserImage from '@containers/UserImage.vue'
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
    }
  },
  computed: {
    profiles () {
      // TODO delete this, it's just for mocks
      // return {
      //   s1: this.$store.getters.profilesForGroup().sandy,
      //   s2: this.$store.getters.profilesForGroup().sandy,
      //   s3: this.$store.getters.profilesForGroup().sandy,
      //   s4: this.$store.getters.profilesForGroup().sandy,
      //   s5: this.$store.getters.profilesForGroup().sandy,
      //   s6: {
      //     ...this.$store.getters.profilesForGroup().sandy,
      //     pending: true
      //   },
      //   s7: this.$store.getters.profilesForGroup().sandy,
      //   s8: this.$store.getters.profilesForGroup().sandy,
      //   s9: this.$store.getters.profilesForGroup().sandy,
      //   s10: this.$store.getters.profilesForGroup().sandy,
      //   s11: this.$store.getters.profilesForGroup().sandy,
      //   s12: this.$store.getters.profilesForGroup().sandy,
      //   s13: this.$store.getters.profilesForGroup().sandy,
      //   s14: this.$store.getters.profilesForGroup().sandy
      // }
      return this.$store.getters.profilesForGroup()
    },
    profilesCount () {
      return Object.keys(this.profiles).length
    }
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

.pill {
  background: $text_0;
  color: $general_2;
  font-weight: 600;
  border-radius: 3px;
  padding: 0.375rem 0.5rem;
  line-height: 1;
  margin: 0 $spacer-xs;
}

.c-actions-content.c-content {
  left: auto;
  min-width: 214px;
}

</style>
