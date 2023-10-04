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
          v-for='{chatRoomId, partners, lastJoinedPartner, title, picture} in filteredRecents'
          @click='onAddSelection(partners)'
          :key='chatRoomId'
        )
          profile-card(
            :username='lastJoinedPartner'
            deactivated
            direction='top-left'
          )
            .c-identity
              .picture-wrapper
                avatar-user(:username='lastJoinedPartner' size='sm')
                .c-badge(v-if='partners.length > 1') {{ partners.length }}
              .c-name(data-test='lastJoinedPartner')
                span
                  strong {{ title }}
                  .c-display-name(v-if='title !== lastJoinedPartner' data-test='profileName') @{{ partners.join(', @') }}

      .is-subtitle
        i18n(
          tag='h3'
          :args='{ nbMembers: filteredOthers.length }'
        ) Others ({nbMembers})
      transition-group(
        name='slide-list'
        data-test='others'
        tag='ul'
      )
        li.c-search-member(
          v-for='{username, displayName} in filteredOthers'
          @click='onAddSelection(username)'
          :key='username'
        )
          profile-card(:username='username' deactivated direction='top-left')
            .c-identity
              avatar-user(:username='username' size='sm')
              .c-name(data-test='username')
                span
                  strong {{ localizedName(username, displayName) }}
                  .c-display-name(v-if='displayName' data-test='profileName') @{{ username }}
</template>

<script>
import { L, LTags } from '@common/common.js'
import { difference } from '@model/contracts/shared/giLodash.js'
import { mapGetters } from 'vuex'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import UsersSelector from '@components/UsersSelector.vue'
import ProfileCard from '@components/ProfileCard.vue'
import AvatarUser from '@components/AvatarUser.vue'
import DMMixin from './DMMixin.js'
import { filterByKeyword } from '@view-utils/filters.js'

export default ({
  name: 'NewDirectMessageModal',
  mixins: [
    DMMixin
  ],
  components: {
    ModalBaseTemplate,
    UsersSelector,
    ProfileCard,
    AvatarUser
  },
  data () {
    return {
      searchText: '',
      selections: []
    }
  },
  computed: {
    ...mapGetters([
      'userDisplayName',
      'ourUnreadMessages'
    ]),
    ourNewDMContacts () {
      return this.ourContacts
        .filter(username => {
          if (username === this.ourUsername) {
            return false
          }
          const chatRoomId = this.ourGroupDirectMessageFromUsernames(username)
          return !chatRoomId || !this.ourGroupDirectMessages[chatRoomId].visible
        })
        .map(username => this.ourContactProfiles[username])
    },
    ourRecentConversations () {
      return Object.keys(this.ourGroupDirectMessages)
        .filter(chatRoomId => {
          return this.ourGroupDirectMessages[chatRoomId].visible &&
            // NOTE: this.ourUnreadMessages[chatRoomId] could be undefined just after new partner made direct message with me
            // it's when the identity contract is updated, but chatroom contract is not fully synced yet
            this.ourUnreadMessages[chatRoomId]
        }).map(chatRoomId => {
          const { title, partners, lastJoinedPartner, picture } = this.ourGroupDirectMessages[chatRoomId]
          const lastMessageDate = this.ourUnreadMessages[chatRoomId].readUntil?.createdDate
          return { chatRoomId, title, partners, lastJoinedPartner, picture, lastMessageDate }
        })
        .sort((former, latter) => {
          if (former.lastMessageDate > latter.lastMessageDate) {
            return -1
          } else if (former.lastMessageDate > latter.lastMessageDate) {
            return 1
          }
          return former.title > latter.title ? 1 : -1
        })
    },
    filteredRecents () {
      return this.ourRecentConversations.filter(({ title, partners }) => {
        const upperCasedSearchText = String(this.searchText).toUpperCase()
        if (!difference(partners, this.selections).length) {
          return false
        } else if (String(title).toUpperCase().indexOf(upperCasedSearchText) > -1) {
          return true
        } else if (String(partners.join(', ')).toUpperCase().indexOf(upperCasedSearchText) > -1) {
          return true
        }
        return false
      })
    },
    filteredOthers () {
      return filterByKeyword(this.ourNewDMContacts, this.searchText, ['username', 'displayName'])
        .filter(profile => !this.selections.includes(profile.username))
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
      const name = displayName || `@${username}`
      return username === this.ourUsername ? L('{name} (you)', { name }) : name
    },
    onChangeKeyword (keyword) {
      this.searchText = keyword
    },
    onAddSelection (usernames) {
      if (typeof usernames === 'string') {
        usernames = [usernames]
      }
      for (const username of usernames) {
        if (!this.selections.includes(username)) {
          this.selections.push(username)
        }
      }
    },
    onRemoveSelection (username) {
      this.selections = this.selections.filter(un => un !== username)
    },
    async onSubmit () {
      if (this.selections.length) {
        const chatRoomId = this.ourGroupDirectMessageFromUsernames(this.selections)
        if (chatRoomId) {
          this.redirect(chatRoomId)
        } else {
          await this.createDirectMessage(this.selections)
        }
      } else if (this.searchText) {
        if (this.filteredRecents.length) {
          this.redirect(this.filteredRecents[0].chatRoomId)
        } else if (this.filteredOthers.length) {
          await this.createDirectMessage(this.filteredOthers[0].username)
        }
      }

      this.closeModal()
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

.picture-wrapper {
  position: relative;
  min-width: 2rem;
  margin-right: 0.5rem;
}

.c-badge {
  position: absolute;
  bottom: -0.25rem;
  right: 0;
  border-radius: 0.5rem;
  background-color: $general_0;
  color: $text_0;
  width: 1rem;
  height: 1rem;
  font-size: 0.75rem;
  text-align: center;
}
</style>
