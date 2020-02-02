<template lang='pug'>
modal-base-template(ref='modal' :fullscreen='true')
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
              :data-test='search'
              v-model='form.search'
            )

        i18n.c-member-count.has-text-1(
          tag='div'
          :args='{ groupMembersCount }'
        ) {groupMembersCount} members

      transition-expand
        table.table.c-table(v-if='searchResult')
          tbody.c-group-list
            tr.c-group-member(
              v-for='(member, username, index) in searchResult'
              :class='member.pending && "is-pending"'
              :key='username'
            )
              td
                user-image(:username='username')

              td.c-name.has-ellipsis(data-test='username')
                strong {{ member.displayName ? member.displayName : username }}

                span(
                  data-test='profileName'
                  v-if='member.displayName'
                ) @{{ ourUsername }}

              td.c-actions
                button.button.is-outlined.is-small(
                  to='/chat'
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
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import TransitionExpand from '@components/TransitionExpand.vue'
import UserImage from '@components/UserImage.vue'

export default {
  name: 'IncomeDetails',
  mixins: [validationMixin],
  components: {
    ModalBaseTemplate,
    TransitionExpand,
    UserImage
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
    closeModal () {
      this.$refs.modal.close()
    },
    displayName (user) {
      const userContract = this.$store.getters.ourUserIdentityContract
      return userContract && userContract.attributes && userContract.attributes.displayName
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
.wrapper-container {
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
  width: 100%;
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background-color: $background_0;

  @include tablet {
    padding-top: $spacer-lg;
    justify-content: flex-start;
    background-color: transparent;
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
}

.c-group-member {
  height: 4.5rem;
}

.c-actions {
  text-align: right;

  i {
    margin-right: .5rem;
  }
}

.button + .button {
  margin-left: .5rem;
}
</style>
