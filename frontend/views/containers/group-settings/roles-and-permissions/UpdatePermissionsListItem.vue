<template lang="pug">
li.c-update-permissions-list-item
  .c-user-info
    avatar-user(:contractID='data.userId' size='xs')
    .c-user-info-text
      .c-display-name.has-text-bold {{ getDisplayName(profile) }}
      .c-username @{{ profile.username }}

  .c-set-permissions-container
    | TODO

  .c-remove-entry-container
    button.is-icon-small.is-btn-shifted(
      type='button'
      :aria-label='L("Remove role entry")'
      @click.stop='remove'
    )
      i.icon-times
</template>

<script>
import { mapGetters } from 'vuex'
import AvatarUser from '@components/AvatarUser.vue'

export default {
  name: 'UpdatePermissionsListItem',
  components: {
    AvatarUser
  },
  props: {
    data: {
      type: Object, // { userId: string, role: string, permissions: string[] }
      required: true
    }
  },
  computed: {
    ...mapGetters([
      'globalProfile'
    ]),
    profile () {
      return this.globalProfile(this.data.userId)
    }
  },
  methods: {
    getDisplayName (profile) {
      return profile.displayName || profile.username
    },
    remove () {
      this.$emit('remove', this.data.userId)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-update-permissions-list-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  column-gap: 0.5rem;
  box-shadow: inset 0 2px 0 $general_2;
  padding: 1.25rem 0;

  @include tablet {
    column-gap: 0.75rem;
  }
}

.c-user-info {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 0.5rem;

  .c-user-info-text {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    font-size: 0.725rem;
    flex-grow: 1;
    max-width: calc(100% - 2rem);

    // TODO: Implement ellipsis style for .c-username and .c-display-name
    .c-display-name,
    .c-username {
      position: relative;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: inherit;
      line-height: 1.2;
    }

    .c-display-name {
      color: $text_0;
    }
  }
}
</style>
