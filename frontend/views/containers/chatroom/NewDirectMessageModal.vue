<template lang='pug'>
modal-base-template.has-background(
  ref='modal'
  :fullscreen='true'
  :a11yTitle='L("New Direct Message")'
  :autofocus='false'
)
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Create a new direct message

    .card.c-card
      search(
        ref='search'
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

      i18n.c-member-count.has-text-1(
        v-if='!searchText'
        tag='div'
        :args='{ ourNewContactsCount }'
        data-test='memberCount'
      ) {ourNewContactsCount} members

      transition-group(
        v-if='searchResult'
        name='slide-list'
        tag='ul'
      )
        li.c-search-member(
          v-for='{username, displayName} in searchResult'
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
import Search from '@components/Search.vue'
import ProfileCard from '@components/ProfileCard.vue'
import AvatarUser from '@components/AvatarUser.vue'

export default ({
  name: 'NewDirectMessageModal',
  components: {
    ModalBaseTemplate,
    Search,
    ProfileCard,
    AvatarUser
  },
  data () {
    return {
      searchText: ''
    }
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'userDisplayName',
      'ourContacts',
      'mailboxContract',
      'currentIdentityState'
    ]),
    ourNewDMContacts () {
      return this.ourContacts.filter(contact => !Object.keys(this.mailboxContract.users).includes(contact.username))
    },
    ourNewContactsCount () {
      return this.ourNewDMContacts.length
    },
    searchResult () {
      if (!this.searchText) { return this.ourNewDMContacts }

      const searchTextCaps = this.searchText.toUpperCase()
      const isInList = (n) => n.toUpperCase().indexOf(searchTextCaps) > -1
      return this.ourNewDMContacts.filter(({ username, displayName }) =>
        (!searchTextCaps || isInList(username) || isInList(displayName))
      )
    },
    searchCount () {
      return Object.keys(this.searchResult).length
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
      sbp('gi.actions/mailbox/createDirectMessage', {
        contractID: this.currentIdentityState.attributes.mailbox,
        data: { username }
      })
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
</style>
