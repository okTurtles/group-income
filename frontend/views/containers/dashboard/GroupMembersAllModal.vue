<template lang='pug'>
modal-base-template.has-background(ref='modal' :fullscreen='true')
  .c-container
    .c-header
      i18n.is-title-2.c-title(tag='h2') Group members

    .c-content.card.c-card
      form(
        @submit.prevent='submit'
        novalidate='true'
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
          v-if='form.search'
          tag='div'
          :args='{ searchCount: Object.keys(searchResult).length, searchTerm: form.search}'
        ) Showing {searchCount} result for {searchTerm}

        i18n.c-member-count.has-text-1(
          v-else
          tag='div'
          :args='{ groupMembersCount }'
        ) {groupMembersCount} members

      table.table.c-table(v-if='searchResult')
        transition-group.c-group-list(name='slide-list' tag='tbody')
          tr.c-group-member(
            v-for='(member, username, index) in searchResult'
            :class='member.pending && "is-pending"'
            :key='username'
          )
            td.c-identity
              user-image(:username='username')
              .c-name.has-ellipsis(data-test='username')
                strong {{ member.displayName ? member.displayName : username }}

              span(
                data-test='profileName'
                v-if='member.displayName'
              ) @{{ ourUsername }}

            td.c-actions
              menu-parent
                menu-trigger.is-icon-small
                  i.icon-ellipsis-v

                menu-content.c-actions-content
                  ul
                    menu-item(
                      tag='button'
                      item-id='message'
                      icon='comment'
                      @click='toChat'
                    )
                      i18n Send message
                    menu-item(
                      tag='button'
                      item-id='remove'
                      icon='times'
                      @click='openModal("RemoveMember")'
                    )
                      i18n Remove member

              .c-tablet
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
import { mapGetters } from 'vuex'
import { validationMixin } from 'vuelidate'
import { OPEN_MODAL } from '@utils/events.js'
import sbp from '~/shared/sbp.js'
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import UserImage from '@components/UserImage.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '@components/menu/index.js'

export default {
  name: 'IncomeDetails',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    UserImage,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuItem
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
      'groupMembersCount'
    ]),
    searchResult () {
      if (this.form.search) {
        return Object.keys(this.groupProfiles)
          .filter(username => {
            const profile = this.$store.getters.globalProfile(username)
            let isCandidate = profile.name.toUpperCase().indexOf(this.form.search.toUpperCase()) > -1
            if (!isCandidate && profile.displayName) {
              isCandidate = profile.displayName.toUpperCase().indexOf(this.form.search.toUpperCase()) > -1
            }
            return isCandidate
          })
          .reduce((gp, key) => {
            gp[key] = this.groupProfiles[key]
            return gp
          }, {})
      } else {
        return this.groupProfiles
      }
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

.c-content {
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

.c-tablet {
  display: none;

  @include tablet {
    display: block;
  }
}

.c-actions {
  text-align: right;

  .c-tablet {
    i {
      margin-right: .5rem;
    }
  }
}

.c-menu {
  @include tablet {
    display: none;
  }
}

.c-content {
  min-width: 200px;
  left: -200px;
}

.button + .button {
  margin-left: .5rem;
}
</style>
