<template lang="pug">
modal-base-template.has-background(
  ref='modal'
  :fullscreen='true'
  :a11yTitle='L("Add permissions")'
)
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Add permissions

    .card.c-card
      group-members-dropdown
</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import GroupMembersDropdown from '@components/GroupMembersDropdown.vue'

export default ({
  name: 'AddPermissionsModal',
  components: {
    ModalBaseTemplate,
    GroupMembersDropdown
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  width: 100%;
  height: 100%;

  @include tablet {
    width: 50rem;
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
}

.c-header {
  display: flex;
  height: 4.75rem;
  align-items: center;
  justify-content: flex-start;
  padding-left: 1rem;
  background-color: $background_0;
  margin: 0 -1rem;

  @include tablet {
    background-color: transparent;
    margin: 0.75rem auto 0;
  }
}

.c-card {
  margin-top: 1.5rem;
}
</style>
