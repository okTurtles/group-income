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
      .c-add-member-container
        i18n.label Select member to add permissions for:

        .c-member-dropdown-container
          group-members-dropdown(
            ref='groupMembersDropdown'
            v-model='ephemeral.selectedUser'
            :membersToExclude='addedMemberIds'
          )

          i18n.is-success.c-add-btn(
            v-if='ephemeral.selectedUser'
            tag='button'
            type='button'
            @click.stop='addEntry'
          ) Add

      .c-permission-entry-container
        i18n.is-title-3(tag='h3') Role & Permission details

        ul.c-role-entry-list
          li(v-for='entry in ephemeral.roleEntries')
            | {{ entry.user.username }}
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
  data () {
    return {
      ephemeral: {
        selectedUser: null,
        roleEntries: []
      }
    }
  },
  computed: {
    addedMemberIds () {
      return this.ephemeral.roleEntries.map(entry => entry.user.contractID)
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    addEntry () {
      const user = this.ephemeral.selectedUser
      if (this.ephemeral.roleEntries.every(entry => entry.user.contractID !== user.contractID)) {
        this.ephemeral.roleEntries = [
          ...this.ephemeral.roleEntries,
          {
            user,
            role: '',
            permissions: []
          }
        ]

        this.$refs.groupMembersDropdown.clear()
      }
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

.c-member-dropdown-container {
  display: flex;
  column-gap: 0.5rem;
}

button.c-add-btn {
  border-radius: $radius;
  min-height: unset;
}

.c-permission-entry-container {
  position: relative;
  margin-top: 2rem;
  border-top: 1px solid $general_0;
  padding-top: 2rem;
}
</style>
