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
        i18n.is-title-3(tag='h3') Add permissions details
        i18n.has-text-1.c-title-desc(tag='p') Select group members and set their role and permissions.

        i18n.is-title-4.c-select-member-title(tag='h4') Add members:
        .c-member-dropdown-container
          group-members-dropdown(
            ref='groupMembersDropdown'
            v-model='ephemeral.selectedUser'
            :membersToExclude='addedMemberIds'
          )

          i18n.is-primary.c-add-btn(
            v-if='ephemeral.selectedUser'
            tag='button'
            type='button'
            @click.stop='addEntry'
          ) Add

      .c-permission-entry-container
        i18n.is-title-4.c-set-permissions-title(tag='h4') Set permissions:

        ul.c-role-entry-list
          update-permissions-list-item.c-permission-entry(
            v-for='entry in ephemeral.roleEntries'
            :key='entry.userId'
            :data='entry'
            @remove='removeEntry'
          )
</template>

<script>
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import GroupMembersDropdown from '@components/GroupMembersDropdown.vue'
import UpdatePermissionsListItem from './UpdatePermissionsListItem.vue'

export default ({
  name: 'AddPermissionsModal',
  components: {
    ModalBaseTemplate,
    GroupMembersDropdown,
    UpdatePermissionsListItem
  },
  data () {
    return {
      ephemeral: {
        selectedUser: null,
        roleEntries: [] // { userId: string, role: string, permissions: string[] }
      }
    }
  },
  computed: {
    addedMemberIds () {
      return this.ephemeral.roleEntries.map(entry => entry.userId)
    }
  },
  methods: {
    closeModal () {
      this.$refs.modal.close()
    },
    addEntry () {
      const user = this.ephemeral.selectedUser
      if (this.ephemeral.roleEntries.every(entry => entry.userId !== user.contractID)) {
        this.ephemeral.roleEntries = [
          ...this.ephemeral.roleEntries,
          {
            userId: user.contractID,
            role: '',
            permissions: []
          }
        ]

        this.$refs.groupMembersDropdown.clear()
      }
    },
    removeEntry (userId) {
      this.ephemeral.roleEntries = this.ephemeral.roleEntries.filter(entry => entry.userId !== userId)
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

.c-title-desc {
  margin: 0.5rem 0;
}

.c-select-member-title {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
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
  margin-top: 3rem;
}

.c-role-entry-list {
  position: relative;
  width: 100%;
  margin-top: 1.5rem;

  .c-permission-entry:not(:last-child) {
    margin-bottom: 1rem;
  }
}
</style>
