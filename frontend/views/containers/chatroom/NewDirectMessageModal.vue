<template lang='pug'>
modal-base-template.has-background(
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
        :userIDs='selections'
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
          v-for='({chatRoomID, partners, members, lastJoinedPartner, title, picture, isDMToMyself}, index) in filteredRecents'
          @click='onRecentConvoSelection(filteredRecents[index])'
          :key='chatRoomID'
        )
          profile-card(
            :contractID='lastJoinedPartner'
            deactivated
            direction='top-left'
          )
            .c-identity
              .picture-wrapper
                avatar-user(:contractID='lastJoinedPartner' size='sm')
                .c-badge(v-if='partners.length > 1') {{ partners.length }}
              .c-name(data-test='lastJoinedPartner')
                span
                  strong {{ title }}
                  i18n.c-display-name(v-if='isDMToMyself' data-test='profileName') (you)
                  .c-display-name(v-else-if='title !== lastJoinedPartner' data-test='profileName') @{{ partners.map(p => p.username).join(', @') }}

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
          v-for='{contractID, username, displayName} in filteredOthers'
          @click='onAddSelection(contractID)'
          :key='username'
        )
          profile-card(:contractID='contractID' deactivated direction='top-left')
            .c-identity
              avatar-user(:contractID='contractID' size='sm')
              .c-name(data-test='username')
                span
                  strong {{ localizedName(username, displayName) }}
                  .c-display-name(v-if='displayName' data-test='profileName') @{{ username }}
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { difference } from '@model/contracts/shared/giLodash.js'
import { mapGetters } from 'vuex'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import UsersSelector from '@components/UsersSelector.vue'
import ProfileCard from '@components/ProfileCard.vue'
import AvatarUser from '@components/AvatarUser.vue'
import DMMixin from './DMMixin.js'
import { filterByKeyword } from '@view-utils/filters.js'
import { CLOSE_MODAL } from '@utils/events.js'

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
      'userDisplayNameFromID',
      'usernameFromID',
      'ourUsername',
      'ourContactProfilesById',
      'ourIdentityContractId',
      'currentGroupContactProfilesById'
    ]),
    ourNewDMContacts () {
      const currentGroupUserIds = Object.keys(this.currentGroupContactProfilesById)

      return currentGroupUserIds
        .filter(userID => {
          const chatRoomID = this.ourGroupDirectMessageFromUserIds(userID)
          return !chatRoomID || !this.ourGroupDirectMessages[chatRoomID].visible
        })
        .map(userID => this.currentGroupContactProfilesById[userID])
    },
    ourRecentConversations () {
      return Object.keys(this.ourGroupDirectMessages)
        .filter(chatRoomID => this.ourGroupDirectMessages[chatRoomID].visible)
        .map(chatRoomID => {
          const { title, partners, lastJoinedPartner, picture, lastMsgTimeStamp, isDMToMyself } = this.ourGroupDirectMessages[chatRoomID]
          return { chatRoomID, title, partners, lastJoinedPartner, picture, lastMsgTimeStamp, isDMToMyself }
        })
        .sort((former, latter) => {
          const diff = former.lastMsgTimeStamp - latter.lastMsgTimeStamp
          return diff > 0 ? -1 : (diff < 0 ? 1 : (former.title > latter.title ? 1 : -1))
        })
    },
    filteredRecents () {
      if (!this.searchText && !this.selections.length) {
        return this.ourRecentConversations
      }
      return this.ourRecentConversations.filter(({ title, partners }) => {
        const partnerIDs = partners.map(p => p.contractID)
        const upperCasedSearchText = String(this.searchText).toUpperCase().normalize()
        if (!difference(partnerIDs, this.selections).length) {
          // match with contractIDs
          return false
        } else if (String(title).toUpperCase().normalize().includes(upperCasedSearchText)) {
          // match with title
          return true
        } else {
          // match with username and displayname
          const userKeywords = upperCasedSearchText.replace(/\s/g, '').split(',')
          return userKeywords.reduce((found, userKeyword, index, arr) => {
            const isLastUserKeyword = index === arr.length - 1
            let currentFound = false
            if (isLastUserKeyword) {
              currentFound = partners.findIndex(p => {
                return p.username.toUpperCase().normalize().includes(userKeyword) ||
                  p.displayName.toUpperCase().normalize().includes(userKeyword)
              }) >= 0
            } else {
              currentFound = partners.findIndex(p => {
                return p.username.toUpperCase().normalize() === userKeyword ||
                  p.displayName.toUpperCase().normalize() === userKeyword
              }) >= 0
            }
            return found && currentFound
          }, true)
        }
      }).sort((a, b) => a.partners.length > b.partners.length ? 1 : -1)
    },
    hasDMToMyself () {
      return !!this.filteredRecents.length && this.filteredRecents.some(convo => convo.isDMToMyself)
    },
    filteredOthers () {
      return filterByKeyword(this.ourNewDMContacts, this.searchText, ['username', 'displayName'])
        .filter(profile => !this.selections.includes(profile.contractID))
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
    onAddSelection (contractIDs) {
      if (typeof contractIDs === 'string') {
        contractIDs = [contractIDs]
      }
      for (const contractID of contractIDs) {
        if (!this.selections.includes(contractID)) {
          this.selections.push(contractID)
        }
      }
    },
    onRecentConvoSelection (convo) {
      const { isDMToMyself, partners } = convo

      if (isDMToMyself) {
        const chatRoomID = this.ourGroupDirectMessageFromUserIds(this.ourIdentityContractId)
        this.redirect(chatRoomID)
      } else {
        this.onAddSelection(partners.map(p => p.contractID))
      }
    },
    onRemoveSelection (contractID) {
      this.selections = this.selections.filter(cID => cID !== contractID)
    },
    async onSubmit () {
      /**
       * TODO for DM to yourself
       *
       * 1. Make sure there is no duplicate creation.
       * 2. Make sure the picture looks properly everywhere. (o)
       * 3. Make sure the localized name is used everywhere.
       * 4. Hide 'Add member' cta everywhere. (o)
       */
      if (!this.selections.length) { return }

      const isDMToMyself = this.selections.length === 1 &&
        this.selections[0] === this.ourIdentityContractId
      const memberIds = isDMToMyself
        ? this.selections
        : this.selections.filter(id => id !== this.ourIdentityContractId)

      const existingChatRoomID = this.ourGroupDirectMessageFromUserIds(memberIds)
      if (existingChatRoomID) {
        this.redirect(existingChatRoomID)
      } else {
        await this.createDirectMessage(memberIds)
      }

      this.closeModal()
    },
    closeModal () {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
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
  display: block;
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
