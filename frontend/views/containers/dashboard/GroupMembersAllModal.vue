<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true')
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Group members

    .card.c-card
      form(
        @submit.prevent='submit'
      )
        label.field
          i18n.sr-only Search for a member
          .input-combo
            .is-icon(:aria-label='L("Search")')
              i.icon-search
            input.input(
              type='text'
              name='search'
              data-test='search'
              placeholder='Search...'
              v-model='form.search'
            )
            button.is-icon-small(
              v-if='form.search'
              aria-label='Clear search'
              @click='form.search = null'
            )
              i.icon-times

        i18n.c-member-count.has-text-1(
          v-if='form.search && searchCount > 0'
          tag='div'
          :args='{ searchCount: `<strong>${searchCount}</strong>`, result: `<strong>${searchCount === 1 ? L("result") : L("results")}</strong>`, searchTerm: `<strong>${form.search}</strong>`}'
          data-test='memberSearchCount'
          compile
        ) Showing {searchCount} {result} for "{searchTerm}"

        i18n.c-member-count.has-text-1(
          v-if='form.search && searchCount === 0'
          tag='div'
          :args='{searchTerm: `<strong>${form.search}</strong>`}'
        ) Sorry, we couldn't find anyone called "{searchTerm}"

        i18n.c-member-count.has-text-1(
          v-if='!form.search'
          tag='div'
          :args='{ groupMembersCount }'
          data-test='memberCount'
        ) {groupMembersCount} members

      transition-group(
        v-if='searchResult'
        name='slide-list'
        tag='ul'
      )
        li.c-search-member(
          v-for='{username, displayName} in searchResult'
          :key='username'
        )
          .c-identity
            user-image(:username='username')
            .c-name(data-test='username')
              strong {{ displayName ? displayName : username }}
              .c-display-name(
                data-test='profileName'
                v-if='displayName'
              ) @{{ username }}

          .c-actions
            group-member-menu.c-action-menu(:username='username')

            .c-actions-buttons.buttons
              button.button.is-outlined.is-small(
                @click='toMessages(username)'
              )
                i.icon-comment
                i18n Send message
              button.button.is-outlined.is-small(
                @click='openModal("RemoveMember")'
              )
                i.icon-times
                i18n Remove member
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapGetters } from 'vuex'
import { OPEN_MODAL } from '@utils/events.js'
import ModalBaseTemplate from '@components/modal/ModalBaseTemplate.vue'
import UserImage from '@components/UserImage.vue'
import GroupMemberMenu from '@containers/dashboard/GroupMemberMenu.vue'

export default {
  name: 'GroupMembersAllModal',
  components: {
    ModalBaseTemplate,
    UserImage,
    GroupMemberMenu
  },
  data () {
    return {
      form: {
        search: null
      }
    }
  },
  computed: {
    ...mapGetters([
      'groupProfiles',
      'globalProfile',
      'groupMembersCount'
    ]),
    searchResult () {
      return Object.keys(this.groupProfiles)
        .map(username => {
          const inList = (n) => n.toUpperCase().indexOf(this.form.search.toUpperCase()) > -1
          const { displayName } = this.globalProfile(username)
          if (!this.form.search || inList(username) || (displayName ? inList(displayName) : false)) {
            return { username, displayName }
          }
        })
        .filter(profile => profile !== undefined)
    },
    searchCount () {
      return Object.keys(this.searchResult).length
    }
  },
  methods: {
    openModal (name) {
      sbp('okTurtles.events/emit', OPEN_MODAL, name)
    },
    closeModal () {
      this.$refs.modal.close()
    },
    toMessages (username) {
      this.$router.push({ path: `/messages/${username}` })
    }
  }
}
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
    width: 38.75rem;
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
    padding-top: $spacer-lg;
    justify-content: flex-start;
    background-color: transparent;
    margin: 0;
  }
}

.c-card {
  margin-top: 1.5rem;
}

.c-member-count {
  margin-top: .5rem;
  margin-bottom: 1.5rem;
}

.input-combo {
  align-items: center;

  .is-icon {
    left: 0;
    right: auto;
  }

  .is-icon-small {
    position: absolute;
    right: $spacer-sm;
    background: $general_2;
    border-radius: 50%;

    &:hover {
      background: $general_1;
    }
  }
}

.c-identity {
  display: flex;
  align-items: center;
}

.c-name {
  margin-left: 1.5rem;
  min-width: 100%;
}

.c-display-name {
  color: var(--text_1);
}

.c-search-member {
  display: flex;
  height: 4.5rem;
  padding: 0;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid $general_0;
  transition: opacity ease-in .25s, height ease-in .25s;

  &:last-child {
    border-bottom: 0;
  }
}

.slide-list-enter, .slide-list-leave-to {
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
    margin-right: .5rem;
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
