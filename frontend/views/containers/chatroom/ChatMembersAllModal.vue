<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true' :a11yTitle='L("Channel members")')
  .c-container
    .c-header
      div
        i18n.is-title-2.c-title(
          tag='h2'
        ) Members
        .c-description {{ attributes.name }} ∙ {{attributes.private ? L("Private channel") : L("Public channel")}}

    .card.c-card
      search(
        :placeholder='L("Search...")'
        :label='L("Search")'
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
            :args='{  nbMembers: chatRoomUsersInSort.length }'
          ) Channel members ({nbMembers})

        transition-group(
          v-if='addedMembers'
          name='slide-list'
          tag='ul'
          data-test='joinedChannelMembersList'
        )
          li.c-search-member(
            v-for='{username, displayName, departedDate} in addedMembers'
            :key='username'
          )
            profile-card(:username='username' direction='top-left')
              .c-identity
                avatar-user(:username='username' size='sm')
                .c-name(data-test='username')
                  span
                    strong {{ localizedName(username) }}
                    .c-display-name(v-if='displayName !== username' data-test='profileName') @{{ username }}

              .c-actions
                button.is-icon(
                  v-if='!departedDate'
                  @click.stop='removeMember(username)'
                )
                  i.icon-times
                .has-text-success(v-else)
                  i.icon-check
                  i18n Removed.
                  button.is-unstyled.c-action-undo(
                    @click.stop='addToChannel(username, true)'
                  ) Undo

        .is-subtitle.c-second-section
          i18n(
            tag='h3'
            :args='{  nbMembers: canAddMembers.length }'
          ) Others ({nbMembers})

      transition-group(
        v-if='searchResult'
        name='slide-list'
        tag='ul'
        data-test='unjoinedChannelMembersList'
      )
        li.c-search-member(
          v-for='{username, displayName, joinedDate} in searchResult'
          :key='username'
        )
          profile-card(:username='username' direction='top-left')
            .c-identity
              avatar-user(:username='username' size='sm')
              .c-name(data-test='username')
                span
                  strong {{ localizedName(username) }}
                  .c-display-name(v-if='displayName !== username' data-test='profileName') @{{ username }}

            .c-actions
              i18n.button.is-outlined.is-small(
                v-if='!joinedDate'
                tag='button'
                @click.stop='addToChannel(username)'
                data-test='addToChannel'
                :args='LTags("span")'
              ) Add {span_} to channel{_span}
              .has-text-success(v-else)
                i.icon-check
                i18n Added.
                button.is-unstyled.c-action-undo(
                  @click.stop='removeMember(username, true)'
                ) Undo
</template>

<script>
import sbp from '~/shared/sbp.js'
import L, { LTags } from '@view-utils/translations.js'
import { mapGetters, mapState } from 'vuex'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import Search from '@components/Search.vue'
import AvatarUser from '@components/AvatarUser.vue'
import ProfileCard from '@components/ProfileCard.vue'
import GroupMembersTooltipPending from '@containers/dashboard/GroupMembersTooltipPending.vue'
import { CHATROOM_PRIVACY_LEVEL } from '@model/contracts/constants.js'

export default ({
  name: 'ChatMembersAllModal',
  components: {
    ModalBaseTemplate,
    Search,
    AvatarUser,
    GroupMembersTooltipPending,
    ProfileCard
  },
  data () {
    return {
      searchText: '',
      addedMembers: [],
      canAddMembers: []
    }
  },
  created () {
    this.addedMembers = this.chatRoomUsersInSort.map(member => ({ ...member, departedDate: null }))
    this.canAddMembers = this.groupMembersSorted
      .filter(member => !this.addedMembers.find(mb => mb.username === member.username))
      .map(member => ({
        username: member.username,
        displayName: member.displayName,
        joinedDate: null
      }))
  },
  computed: {
    ...mapGetters([
      'currentChatRoomState',
      'groupMembersSorted',
      'groupMembersCount',
      'groupMembersByUsername',
      'chatRoomUsersInSort',
      'ourUsername',
      'userDisplayName',
      'isJoinedChatRoom'
    ]),
    ...mapState([
      'currentGroupId',
      'currentChatRoomId'
    ]),
    searchResult () {
      if (!this.searchText) { return this.canAddMembers }

      const searchTextCaps = this.searchText.toUpperCase()
      const isInList = (n) => n.toUpperCase().indexOf(searchTextCaps) > -1
      return this.canAddMembers.filter(({ username, displayName }) =>
        (!searchTextCaps || isInList(username) || isInList(displayName))
      )
    },
    searchCount () {
      return Object.keys(this.searchResult).length
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
      const { name, description, privacyLevel } = this.currentChatRoomState.attributes
      return { name, description, private: privacyLevel === CHATROOM_PRIVACY_LEVEL.PRIVATE, privacyLevel }
    }
  },
  methods: {
    localizedName (username: string) {
      const name = this.userDisplayName(username)
      return username === this.ourUsername ? L('{name} (you)', { name }) : name
    },
    closeModal () {
      this.$refs.modal.close()
    },
    async removeMember (username: string, undoing = false) {
      if (!this.isJoinedChatRoom(this.currentChatRoomId, username)) {
        console.log(`${username} is not part of this chatroom`)
        return
      }
      try {
        await sbp('gi.actions/chatroom/leave', {
          contractID: this.currentChatRoomId,
          data: { username }
        })
        if (undoing) {
          this.canAddMembers = this.canAddMembers.map(member =>
            member.username === username ? { ...member, joinedDate: null } : member)
        } else {
          this.addedMembers = this.addedMembers.map(member =>
            member.username === username ? { ...member, departedDate: new Date().toISOString() } : member)
        }
      } catch (e) {
        console.error('ChatMembersAllModal.vue removeMember() error:', e)
      }
    },
    async addToChannel (username: string, undoing = false) {
      if (this.isJoinedChatRoom(this.currentChatRoomId, username)) {
        console.log(`${username} is already joined this chatroom`)
        return
      }

      try {
        await sbp('gi.actions/group/joinChatRoom', {
          contractID: this.currentGroupId,
          data: { username, chatRoomID: this.currentChatRoomId }
        })
        if (undoing) {
          this.addedMembers = this.addedMembers.map(member =>
            member.username === username ? { ...member, departedDate: null } : member)
        } else {
          this.canAddMembers = this.canAddMembers.map(member =>
            member.username === username ? { ...member, joinedDate: new Date().toISOString() } : member)
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
    margin-left: 0.3rem;

    @include phone {
      display: none;
    }
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
