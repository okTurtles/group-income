<template lang='pug'>
modal-base-template.has-background(
  ref='modal'
  :fullscreen='true'
  :a11yTitle='L("Channel members")'
  :autofocus='false'
)
  .c-container
    .c-header
      div
        i18n.is-title-2.c-title(
          tag='h2'
        ) Members
        .c-description {{ attributes.name }} ∙ {{attributes.privacy}}

    .card.c-card
      search(
        :placeholder='L("Search...")'
        :label='L("Search")'
        :autofocus='true'
        v-model='searchText'
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

      .c-list-to-add
        .is-subtitle
          i18n(
            tag='h3'
            :args='{  nbMembers: filteredRecents.length }'
          ) Channel members ({nbMembers})

        transition-group(
          name='slide-list'
          tag='ul'
          data-test='joinedChannelMembersList'
        )
          li.c-search-member(
            v-for='{contractID, username, displayName, departedDate} in filteredRecents'
            :key='contractID'
          )
            profile-card(:contractID='contractID' direction='top-left')
              .c-identity
                avatar-user(:contractID='contractID' size='sm')
                .c-name(data-test='username')
                  span
                    strong {{ localizedName(contractID, username, displayName) }}
                    .c-display-name(v-if='displayName' data-test='profileName') @{{ username }}

              .c-actions(v-if='!isGroupDirectMessage() && isJoined && removable(contractID)')
                button.is-icon(
                  v-if='!departedDate'
                  :data-test='"removeMember-" + username'
                  @click.stop='removeMember(contractID)'
                )
                  i.icon-times
                .has-text-success(v-else)
                  i.icon-check
                  i18n Removed.
                  button.is-unstyled.c-action-undo(
                    @click.stop='addToChannel(contractID, true)'
                  ) {{L("Undo")}}

        template(v-if='isJoined')
          .is-subtitle.c-second-section
            i18n(
              tag='h3'
              :args='{ nbMembers: filteredOthers.length }'
            ) Others ({nbMembers})

          transition-group(
            name='slide-list'
            tag='ul'
            data-test='unjoinedChannelMembersList'
          )
            li.c-search-member(
              v-for='{contractID, username, displayName, joinedDate} in filteredOthers'
              :key='contractID'
            )
              profile-card(:contractID='contractID' direction='top-left')
                .c-identity
                  avatar-user(:contractID='contractID' size='sm')
                  .c-name(data-test='username')
                    span
                      strong {{ localizedName(contractID, username, displayName) }}
                      .c-display-name(v-if='displayName' data-test='profileName') @{{ username }}

                .c-actions
                  button-submit.button.is-outlined.is-small(
                    v-if='!joinedDate'
                    type='button'
                    @click.stop='addToChannel(contractID)'
                    :data-test='"addToChannel-" + username'
                  )
                    i18n(:args='LTags("span")') Add {span_}to channel{_span}

                  .has-text-success(v-else)
                    i.icon-check
                    i18n Added.
                    button-submit.is-unstyled.c-action-undo(
                      v-if='!isGroupDirectMessage()'
                      @click.stop='removeMember(contractID, true)'
                    )
                      i18n Undo
</template>

<script>
import sbp from '@sbp/sbp'
import { L, LTags } from '@common/common.js'
import { mapGetters, mapState } from 'vuex'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import Search from '@components/Search.vue'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import DMMixin from './DMMixin.js'
import GroupMembersTooltipPending from '@containers/dashboard/GroupMembersTooltipPending.vue'
import { CHATROOM_PRIVACY_LEVEL, PROFILE_STATUS } from '@model/contracts/shared/constants.js'
import { REPLACE_MODAL } from '@utils/events.js'
import { uniq } from 'turtledash'
import { filterByKeyword } from '@view-utils/filters.js'

export default ({
  name: 'ChatMembersAllModal',
  mixins: [
    DMMixin
  ],
  components: {
    ModalBaseTemplate,
    Search,
    AvatarUser,
    GroupMembersTooltipPending,
    ProfileCard,
    ButtonSubmit
  },
  data () {
    return {
      searchText: '',
      addedMembers: [],
      canAddMembers: []
    }
  },
  computed: {
    ...mapGetters([
      'currentChatRoomState',
      'groupGeneralChatRoomId',
      'groupMembersSorted',
      'groupChatRooms',
      'chatRoomMembers',
      'chatRoomMembersInSort',
      'globalProfile',
      'isJoinedChatRoom',
      'ourIdentityContractId',
      'ourContactsById',
      'ourContactProfilesById'
    ]),
    ...mapState([
      'currentGroupId'
    ]),
    chatroomActiveMembers () {
      const activeMemberEntries = Object.entries(this.chatRoomMembers).filter(([, joinInfo]) => !joinInfo.hasLeft)
      return Object.fromEntries(activeMemberEntries)
    },
    filteredRecents () {
      return filterByKeyword(this.addedMembers, this.searchText, ['username', 'displayName'])
    },
    filteredOthers () {
      return filterByKeyword(this.canAddMembers, this.searchText, ['username', 'displayName'])
    },
    searchCount () {
      return Object.keys(this.filteredOthers).length + Object.keys(this.filteredRecents).length
    },
    resultsCopy () {
      const args = {
        searchCount: `<strong>${this.searchCount}</strong>`,
        searchTerm: `<strong>${this.searchText}</strong>`,
        ...LTags('strong')
      }
      return this.searchCount === 1
        ? L('Showing {strong_}1 result{_strong} for "{searchTerm}"', args)
        : L('Showing {searchCount} {strong_}results{_strong} for "{searchTerm}"', args)
    },
    attributes () {
      const { name, description, privacyLevel } = this.chatRoomAttribute
      let title = name
      if (this.isGroupDirectMessage(this.currentChatRoomId)) {
        title = this.ourGroupDirectMessages[this.currentChatRoomId].title
      }
      const privacy = {
        [CHATROOM_PRIVACY_LEVEL.PRIVATE]: L('Private channel'),
        [CHATROOM_PRIVACY_LEVEL.GROUP]: L('Group members only'),
        [CHATROOM_PRIVACY_LEVEL.PUBLIC]: L('Public channel')
      }[privacyLevel]
      return { name: title, description, privacy }
    },
    isJoined () {
      return this.isJoinedChatRoom(this.currentChatRoomId)
    },
    chatRoomAttribute () {
      // NOTE: Do not consider to get attributes of private chatroom which the user is not part of
      //       because it couldn't be happened
      // TODO: remove 'users', 'deletedDate' to keep consistency when this.isJoined === false
      return this.isJoined ? this.currentChatRoomState.attributes : this.groupChatRooms[this.currentChatRoomId]
    },
    chatRoomMembersInOrder () {
      return this.isJoined
        ? this.chatRoomMembersInSort
        : this.groupMembersSorted
          .filter(member => this.groupChatRooms[this.currentChatRoomId].members[member.contractID]?.status === PROFILE_STATUS.ACTIVE)
          .map(member => ({ contractID: member.contractID, username: member.username, displayName: member.displayName }))
    }
  },
  mounted () {
    this.initializeMembers()
  },
  methods: {
    initializeMembers () {
      if (this.isGroupDirectMessage()) {
        this.addedMembers = Object.keys(this.chatroomActiveMembers)
          .map(contractID => {
            const profile = contractID === this.ourIdentityContractId ? this.globalProfile(contractID) : this.ourContactProfilesById[contractID]
            return {
              displayName: profile.displayName,
              username: profile.username,
              contractID,
              departedDate: null
            }
          })
        // TODO: every user needs to sync his contacts and also users from group messages
        // https://okturtles.slack.com/archives/C0EH7P20Y/p1669109352107659
        this.canAddMembers = this.ourContactsById
          .filter(contractID => !this.addedMembers.find(mb => mb.contractID === contractID))
          .map(contractID => {
            const profile = this.ourContactProfilesById[contractID] || {}
            return {
              contractID,
              username: profile.username,
              displayName: profile.displayName,
              joinedDate: null
            }
          })
      } else {
        this.addedMembers = this.chatRoomMembersInOrder.filter(member => !!this.chatroomActiveMembers[member.contractID])
          .map(member => ({ ...member, departedDate: null }))
        this.canAddMembers = this.groupMembersSorted
          .filter(member => !this.addedMembers.find(mb => mb.contractID === member.contractID) && !member.invitedBy)
          .map(member => ({
            username: member.username,
            displayName: member.displayName,
            contractID: member.contractID,
            joinedDate: null
          }))
      }
    },
    localizedName (contractID, username, displayName) {
      const name = displayName || `@${username || contractID}`
      return contractID === this.ourIdentityContractId ? L('{name} (you)', { name }) : name
    },
    closeModal () {
      this.$refs.modal.close()
    },
    removable (memberID: string) {
      if (!this.isJoined) {
        return false
      }
      const { creatorID } = this.chatRoomAttribute
      if (this.groupGeneralChatRoomId === this.currentChatRoomId) {
        return false
      } else if (this.ourIdentityContractId === creatorID) {
        return true
      } else if (this.ourIdentityContractId === memberID) {
        return true
      }
      return false
    },
    async removeMember (contractID: string, undoing = false) {
      if (!this.isJoinedChatRoom(this.currentChatRoomId, contractID)) {
        console.log(`${contractID} is not part of this chatroom`)
        return
      }

      if (contractID === this.ourIdentityContractId && !undoing) {
        // If it's the current user,open the 'Leave-channel' modal instead.
        return sbp('okTurtles.events/emit', REPLACE_MODAL, 'LeaveChannelModal')
      }

      try {
        await sbp('gi.actions/group/leaveChatRoom', {
          contractID: this.currentGroupId,
          data: {
            chatRoomID: this.currentChatRoomId,
            memberID: contractID
          }
        })
        if (undoing) {
          this.canAddMembers = this.canAddMembers.map(member =>
            member.contractID === contractID ? { ...member, joinedDate: null } : member)
        } else {
          this.addedMembers = this.addedMembers.map(member =>
            member.contractID === contractID ? { ...member, departedDate: new Date().toISOString() } : member)
        }
      } catch (e) {
        console.error('ChatMembersAllModal.vue removeMember() error:', e)
      }
    },
    async addToChannel (contractID: string, undoing = false) {
      if (this.isGroupDirectMessage()) {
        const currentPartnerIDs = this.ourGroupDirectMessages[this.currentChatRoomId].partners.map(p => p.contractID)
        const memberIDs = uniq(currentPartnerIDs.concat(contractID))
        const chatRoomID = this.ourGroupDirectMessageFromUserIds(memberIDs)
        if (chatRoomID) {
          this.redirect(chatRoomID)
        } else {
          this.createDirectMessage(memberIDs)
        }
        this.closeModal()

        return
      }

      if (this.isJoinedChatRoom(this.currentChatRoomId, contractID)) {
        console.log(`${contractID} is already joined this chatroom`)
        return
      }

      try {
        await sbp('gi.actions/group/joinChatRoom', {
          contractID: this.currentGroupId,
          data: { memberID: contractID, chatRoomID: this.currentChatRoomId }
        })
        if (undoing) {
          this.addedMembers = this.addedMembers.map(member =>
            member.contractID === contractID ? { ...member, departedDate: null } : member)
        } else {
          this.canAddMembers = this.canAddMembers.map(member =>
            member.contractID === contractID ? { ...member, joinedDate: new Date().toISOString() } : member)
        }
      } catch (e) {
        console.error('ChatMembersAllModal.vue addToChannel() error:', e)
      }
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

  @include phone {
    justify-content: left;
    padding-left: 1rem;
  }

  @include tablet {
    padding-top: 2rem;
    justify-content: flex-start;
    background-color: transparent;
    margin: 0;
  }
}

.c-description {
  color: $text_1;

  @include phone {
    position: absolute;
    top: 5.5rem;
  }
}

.c-card {
  margin-top: 1.5rem;

  @include phone {
    margin-top: 3rem;
  }
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

::v-deep .c-actions {
  span {
    @include phone {
      display: none;
    }
  }

  i + span {
    margin-left: 0.3rem;
  }

  .c-action-undo {
    margin-left: 0.5rem;
    color: $text_1;

    &:hover,
    &:focus {
      cursor: pointer;
      border-bottom: 1px solid $text_1;
    }
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

.c-second-section::before {
  content: "";
  position: absolute;
  background-color: $general_2;
  height: 1px;
  width: calc(100% + 6rem);
  top: 0;
  left: -3rem;
}
</style>
