<template lang="pug">
div
  .c-container
    svg-invitation.c-svg

    i18n.is-title-1(
      tag='h2'
      :args='{ groupName: groupSettings.groupName }'
    ) Waiting for approval to join {groupName}!

    i18n.has-text-1.c-text(tag='p') You have used a public link to join a group. Once a member of the group approves your member request you’ll be able to access the group.
</template>

<script>
import { mapGetters } from 'vuex'
import SvgInvitation from '@svgs/invitation.svg'

export default ({
  name: 'PendingApproval',
  components: {
    SvgInvitation
  },
  computed: {
    ...mapGetters([
      'groupSettings'
    ])
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 34.5rem;
  margin: auto;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 1rem;

  @include phone {
    padding: 0 1rem;
  }
}

.c-svg {
  display: inline-block;
  margin-top: -3rem;

  @include tablet {
    transform: scale(1.25);
    margin-bottom: 1rem;
  }
}

.c-text {
  font-size: $size_4;
}
</style>
