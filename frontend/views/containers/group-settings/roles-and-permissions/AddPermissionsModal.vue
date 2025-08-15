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
        i18n.has-text-1(tag='p') Select group members and set their roles and permissions details.

        i18n.is-title-4.c-select-member-title(tag='h4') Add members:
        .c-member-dropdown-container
          group-members-dropdown(
            ref='groupMembersDropdown'
            v-model='ephemeral.selectedUser'
            :excludeSelf='true'
            :membersToExclude='memberIdsToExclude'
          )

          i18n.is-primary.c-add-btn(
            v-if='ephemeral.selectedUser'
            tag='button'
            type='button'
            @click.stop='addEntry'
          ) Add

      template(v-if='ephemeral.roleEntries.length')
        .c-permission-entry-container
          i18n.is-title-4.c-set-permissions-title(tag='h4') Set roles and permissions:

          ul.c-role-entry-list
            update-permissions-list-item.c-permission-entry(
              v-for='entry in ephemeral.roleEntries'
              :key='entry.userId'
              :data='entry'
              @update='updateEntry'
              @remove='removeEntry'
            )

        .buttons.c-button-container
          i18n.is-outlined(tag='button' type='button' @click.stop='closeModal') Cancel
          button-submit.is-success.c-update-btn(
            :disabled='!enableUpdateBtn'
            @click='submit'
          )
            i18n Update

</template>

<script>
import { mapGetters } from 'vuex'
import { GROUP_ROLES } from '@model/contracts/shared/constants.js'
import { uniq } from 'turtledash'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import GroupMembersDropdown from '@components/GroupMembersDropdown.vue'
import UpdatePermissionsListItem from './UpdatePermissionsListItem.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'

const isPermissionsArrayEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false
  const arr1Sorted = arr1.slice().sort()
  const arr2Sorted = arr2.slice().sort()
  return arr1Sorted.every((item, index) => item === arr2Sorted[index])
}

export default ({
  name: 'AddPermissionsModal',
  components: {
    ModalBaseTemplate,
    GroupMembersDropdown,
    UpdatePermissionsListItem,
    ButtonSubmit
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
    ...mapGetters([
      'allGroupMemberPermissions',
      'getGroupMemberPermissionsById',
      'ourIdentityContractId'
    ]),
    groupAdminId () {
      const adminEntry = this.allGroupMemberPermissions.find(entry => entry.roleName === GROUP_ROLES.ADMIN)
      return adminEntry?.memberID
    },
    addedMemberIds () {
      return this.ephemeral.roleEntries.map(entry => entry.userId)
    },
    memberIdsToExclude () {
      return uniq([this.groupAdminId, this.ourIdentityContractId, ...this.addedMemberIds])
    },
    enableUpdateBtn () {
      return this.addedMemberIds.some(memberId => {
        const currPermissions = this.getGroupMemberPermissionsById(memberId) // member's current permissions
        const updatedPermissions = this.getEditedPermissionsById(memberId) // permissions of the member edited in this modal
        console.log('!@# currPermissions', currPermissions)
        console.log('!@# updatedPermissions', updatedPermissions)
        return !isPermissionsArrayEqual(currPermissions, updatedPermissions)
      })
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
    updateEntry (payload) {
      const { userId, role, permissions } = payload
      this.ephemeral.roleEntries = this.ephemeral.roleEntries.map(entry => {
        if (entry.userId === userId) {
          return { ...entry, role, permissions }
        }
        return entry
      })
    },
    removeEntry (userId) {
      this.ephemeral.roleEntries = this.ephemeral.roleEntries.filter(entry => entry.userId !== userId)
    },
    getEditedPermissionsById (memberId) {
      const found = this.ephemeral.roleEntries.find(entry => entry.userId === memberId)
      return found ? found.permissions : []
    },
    submit () {
      alert('TODO: Implement submit!')
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

.c-select-member-title {
  margin-top: 2rem;
  margin-bottom: 0.75rem;
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
  margin-top: 1rem;
  box-shadow: inset 0 -2px 0 $general_2;

  .c-permission-entry:not(:last-child) {
    margin-bottom: 1rem;
  }
}

.c-button-container {
  margin-top: 2rem;

  @include phone {
    flex-direction: column-reverse;
    align-items: stretch;
    row-gap: 1rem;

    button {
      margin-right: 0;
      min-height: 1.688rem;
      padding-left: 1rem;
      padding-right: 1rem;
      padding-bottom: 0;
      line-height: 1em;
    }
  }
}
</style>
