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

        i18n.c-member-count.has-text-1(
          v-if='form.search && searchCount > 0'
          tag='div'
          :args='{ searchCount: `<strong>${searchCount}`, result: `${searchCount === 1 ? L("result") : L("results")}</strong>`, searchTerm: `<strong>${form.search}</strong>`}'
          compile
        ) Showing {searchCount} {result} for "{searchTerm}"

        i18n.c-member-count.has-text-1(
          v-if='form.search && searchCount === 0'
          tag='div'
          :args='{searchTerm: `<strong>${form.search}</strong>`}'
          compile
        ) Sorry, we couldn't find anyone called "{searchTerm}"

        i18n.c-member-count.has-text-1(
          v-else
          tag='div'
          :args='{ groupMembersCount }'
        ) {groupMembersCount} members

      table.table.c-table(v-if='searchResult')
        transition-group.c-group-list(name='slide-list' tag='tbody')
          tr.c-group-member(
            v-for='{username, name, displayName} in searchResult'
            :key='username'
          )
            td.c-identity
              user-image(:username='username')
              .c-name(data-test='username')
                strong {{ displayName ? displayName : name }}
                .c-display-name(
                  data-test='profileName'
                  v-if='displayName'
                ) @{{ name }}

            td.c-actions
              group-member-menu

              .c-actions-buttons
                button.button.is-outlined.is-small(
                  @click='toChat'
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
  name: 'IncomeDetails',
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
          const { name, displayName } = this.globalProfile(username)
          if (!this.form.search || inList(name) || (displayName ? inList(displayName) : false)) {
            return { username, name, displayName }
          }
        })
        .filter(profile => profile, [])
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
    toChat () {
      this.$router.push({ path: '/chat' })
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

.input-combo .is-icon {
  left: 0;
  right: auto;
}

.c-table {
  width: 100%;
  tr {
    display: flex;
    justify-content: space-between;
    align-items: center;
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

.c-group-member {
  height: 4.5rem;
  padding: 0;
  transition: opacity ease-in .25s, height ease-in .25s;
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

  i {
    margin-right: .5rem;
  }

  @include tablet {
    display: block;
  }
}

.c-menu {
  @include tablet {
    display: none;
  }
}

.button + .button {
  margin-left: .5rem;
}
</style>
