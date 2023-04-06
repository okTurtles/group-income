<template lang='pug'>
modal-base-template.has-background(
  ref='modal'
  :fullscreen='true'
  :a11yTitle='L("New Direct Message")'
  :autofocus='false'
)
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Direct Messages

    .card.c-card
      users-selector(
        :label='L("Search")'
        :usernames='selections'
        :autofocus='true'
        @change='onChangeKeyword'
        @remove='onRemoveSelection'
        @submit='onSubmit'
      )

      .c-member-count.has-text-1(
        v-if='searchText && searchCount > 0'
        data-test='memberSearchCount'
        v-safe-html='resultsCopy'
      )

      i18n.c-member-count.has-text-1(
        v-if='searchText && searchCount === 0'
        tag='div'
        :args='{searchTerm: `<strong>${searchText}</strong>`}'
      ) Sorry, we couldn't find anyone called "{searchTerm}"

      .is-subtitle
        i18n(
          tag='h3'
          :args='{  nbMembers: filteredRecents.length }'
        ) Recent Conversations ({nbMembers})
      transition-group(
        name='slide-list'
        data-test='recentConversations'
        tag='ul'
      )
        li.c-search-member(
          v-for='{username, displayName} in filteredRecents'
          @click='openDirectMessage(username)'
          :key='username'
        )
          profile-card(:username='username' deactivated direction='top-left')
            .c-identity
              avatar-user(:username='username' size='sm')
              .c-name(data-test='username')
                span
                  strong {{ localizedName(username, displayName) }}
                  .c-display-name(v-if='displayName !== username' data-test='profileName') @{{ username }}

      .is-subtitle
        i18n(
          tag='h3'
          :args='{  nbMembers: filteredOthers.length }'
        ) Others ({nbMembers})
      transition-group(
        name='slide-list'
        data-test='others'
        tag='ul'
      )
        li.c-search-member(
          v-for='{username, displayName} in filteredOthers'
          @click='createNewDirectMessage(username)'
          :key='username'
        )
          profile-card(:username='username' deactivated direction='top-left')
            .c-identity
              avatar-user(:username='username' size='sm')
              .c-name(data-test='username')
                span
                  strong {{ localizedName(username, displayName) }}
                  .c-display-name(v-if='displayName !== username' data-test='profileName') @{{ username }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { mapGetters } from 'vuex'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import UsersSelector from '@components/UsersSelector.vue'
import ProfileCard from '@components/ProfileCard.vue'
import AvatarUser from '@components/AvatarUser.vue'
import { CHATROOM_PRIVACY_LEVEL } from '~/frontend/model/contracts/shared/constants.js'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { filterByKeyword } from '@view-utils/filters.js'

export default ({
  name: 'NewDirectMessageModal',
  components: {
    ModalBaseTemplate,
    UsersSelector,
    ProfileCard,
    AvatarUser
  },
  data () {
    return {
      searchText: '',
      selections: ['alexjin']
    }
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'userDisplayName',
      'ourContacts',
      'ourContactProfiles',
      'ourPrivateDirectMessages',
      'currentIdentityState',
      'ourUnreadMessages',
      'directMessageIDFromUsername'
    ]),
    ourNewDMContacts () {
      return this.ourContacts
        .filter(username => username !== this.ourUsername &&
          (!this.ourPrivateDirectMessages[username] || this.ourPrivateDirectMessages[username].hidden))
        .map(username => this.ourContactProfiles[username])
    },
    ourNewContactsCount () {
      return this.ourNewDMContacts.length
    },
    ourRecentConversations () {
      return Object.keys(this.ourPrivateDirectMessages)
        .filter(username => !this.ourPrivateDirectMessages[username].hidden)
        .map(username => {
          const chatRoomId = this.directMessageIDFromUsername(username)
          // NOTE: this.ourUnreadMessages[chatRoomId] could be undefined
          // just after new parter made direct message with me
          // so the mailbox contract is updated, but chatroom contract is not synced yet and vuex state as well
          const { readUntil, mentions } = this.ourUnreadMessages[chatRoomId] || {}
          const lastMessageDate = mentions && mentions.length
            ? mentions[mentions.length - 1].createdDate
            : readUntil?.createdDate
          return { username, lastMessageDate }
        })
        .sort((former, latter) => {
          if (former.lastMessageDate > latter.lastMessageDate) {
            return -1
          } else if (former.lastMessageDate > latter.lastMessageDate) {
            return 1
          }
          const nameA = this.ourContactProfiles[former.username].displayName || former.username
          const nameB = this.ourContactProfiles[latter.username].displayName || latter.username
          return nameA > nameB ? 1 : -1
        })
        .map(({ username }) => this.ourContactProfiles[username])
    },
    filteredRecents () {
      return filterByKeyword(this.ourRecentConversations, this.searchText, ['username', 'displayName'])
    },
    filteredOthers () {
      return filterByKeyword(this.ourNewDMContacts, this.searchText, ['username', 'displayName'])
    },
    searchCount () {
      return Object.keys(this.filteredOthers).length + Object.keys(this.filteredRecents).length
    },
    resultsCopy () {
      const args = { searchCount: `<strong>${this.searchCount}</strong>`, searchTerm: `<strong>${this.searchText}</strong>`, ...LTags('strong') }
      return this.searchCount === 1 ? L('Showing {strong_}1 result{_strong} for "{searchTerm}"', args) : L('Showing {searchCount} {strong_}results{_strong} for "{searchTerm}"', args)
    }
  },
  methods: {
    localizedName (username, displayName) {
      const name = displayName || this.userDisplayName(username)
      return username === this.ourUsername ? L('{name} (you)', { name }) : name
    },
    createNewDirectMessage (username) {
      if (!this.ourPrivateDirectMessages[username]) {
        sbp('gi.actions/mailbox/createDirectMessage', {
          contractID: this.currentIdentityState.attributes.mailbox,
          data: {
            privacyLevel: CHATROOM_PRIVACY_LEVEL.PRIVATE,
            usernames: [username]
          }
        })
      } else if (this.ourPrivateDirectMessages[username].hidden) {
        const chatRoomId = this.directMessageIDFromUsername(username)
        sbp('gi.actions/mailbox/setDirectMessageVisibility', {
          contractID: this.currentIdentityState.attributes.mailbox,
          data: {
            contractID: chatRoomId,
            hidden: false
          }
        })
      }
      this.closeModal()
    },
    openDirectMessage (username) {
      const chatRoomId = this.directMessageIDFromUsername(username)
      this.$router.push({
        name: 'GroupChatConversation',
        params: { chatRoomId }
      }).catch(logExceptNavigationDuplicated)
      this.closeModal()
    },
    onChangeKeyword (keyword) {
      this.searchText = keyword
    },
    onRemoveSelection (username) {
      this.selections = this.selections.filter(un => un !== username)
    },
    onSubmit () {
      console.log('Submit Action')
    },
    closeModal () {
      this.$refs.modal.close()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  height: 100%;
  width: 100%;
  background-color: $general_2;
}

.c-header,
.c-container {
  @include tablet {
    width: 50rem;
    max-width: 100%;
  }
}

.c-header {
  display: flex;
  height: 4.75rem;
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background-color: $background_0;
  margin: 0 -1rem;

  @include tablet {
    padding-top: 2rem;
    justify-content: flex-start;
    background-color: transparent;
    margin: 0;
  }
}

.c-card {
  margin-top: 1.5rem;
}

.c-member-count {
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}

.c-identity {
  display: flex;
  align-items: center;
  flex-grow: 1;
}

.c-name {
  margin: 0 0.5rem 0 1.5rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-display-name {
  color: var(--text_1);
}

.c-search-member .c-twrapper {
  display: flex;
  height: 4.5rem;
  padding: 0 0.5rem;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $general_0;
  transition: opacity ease-in 0.25s, height ease-in 0.25s;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background-color: $general_1;
    cursor: pointer;
  }
}

.slide-list-enter,
.slide-list-leave-to {
  height: 0;
  opacity: 0;
}

.slide-list-leave-active {
  overflow: hidden;
  border-bottom: 0;
}

.c-actions-buttons {
  display: none;
  margin-top: 0;

  i {
    margin-right: 0.5rem;
  }

  @include tablet {
    display: block;
  }
}

.c-action-menu {
  @include tablet {
    display: none;
  }
}

.is-subtitle {
  display: flex;
  margin-top: 1.875rem;
  margin-bottom: 0.5rem;
}
</style>
