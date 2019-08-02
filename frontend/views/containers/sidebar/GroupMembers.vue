<template lang="pug">
.c-group-members(data-test='groupMembers')
  .c-group-members-header
    i18n.label(tag='label') Members

    button.button.is-small.is-outlined(
      data-test='inviteButton'
      @click='invite'
    )
      i.icon-plus
      i18n Add

  ul
    li.c-group-member(
      v-for='(member, username) in profiles'
      :key='username'
      data-test='member'
    )
      user-image(:username='username')
        //- span.tag(v-if='member.pledge')
        //-   | {{ member.pledge }}

      .c-name(data-test='username')
        | {{ username }}

      menu-parent
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
</template>

<script>
import UserImage from '@containers/UserImage.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/Menu/index.js'

export default {
  name: 'GroupMembers',
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem,
    UserImage
  },
  methods: {
    invite () {
      this.$router.push({ path: '/invite' })
    }
  },
  computed: {
    profiles () {
      return this.$store.getters.profilesForGroup()
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

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -1.5rem;
    right: -1.5rem;
    height: 1px;
    background-color: $border;
  }
}

.c-group-members-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
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
}

.c-actions-content.c-content {
  left: auto;
  min-width: 214px;
}

</style>
