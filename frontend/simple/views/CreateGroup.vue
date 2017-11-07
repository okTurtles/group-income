<template>
  <section id="create-group-page" class="section">
    <!-- TODO: use Bulma's .field -->
    <!-- TODO: center using .centered like SignUp.vue -->
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <form
          ref="form"
          name="CreateGroupForm"
          @submit.prevent="submit"
        >

        <vue-assistant
          :views="[
            comp1,
            comp2
          ]"
        >
          <div slot="step">
            <p class="title is-5"><i18n>What is your Group's Name?</i18n></p>
            <input
              type="text"
              v-validate
              data-vv-as="Group Name"
              data-vv-rules="required"
              name="form.groupName"
              v-model="form.groupName"
              class="input"
            >
          </div>
        >
          <div slot="step">
            <p class="title is-5"><i18n>What are your shared values?</i18n></p>
            <textarea
              class="textarea"
              v-validate
              data-vv-as="Shared Values"
              data-vv-rules="required"
              name="form.sharedValues"
              v-model="form.sharedValues">
            </textarea>
          </div>
        </vue-assistant>

        </form>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>
<style scoped>
  .button-box {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20%;
    margin: 30px 0 0 0;
  }
</style>
<script>
/* @flow */
import Vue from 'vue'
import backend from '../js/backend'
import * as Events from '../../../shared/events'
import * as contracts from '../js/events'
import L from '../js/translations'
import VueAssistant from '../components/VueAssistant.vue'

// TODO remove this, only for testing out VueAssistant
const comp1 = {
  template: '<p>1</p>'
}
const comp2 = {
  template: '<p>2</p>'
}

export default {
  name: 'CreateGroupView',
  components: {
    'vue-assistant': VueAssistant
  },
  methods: {
    submit: async function () {
      try {
        await this.$validator.validateAll()
      } catch (ex) {
        const { control } = document.querySelector('span.help.is-danger').dataset
        document.querySelector(`input[name="${control}"], textarea[name="${control}"]`).focus()
        document.querySelector(`input[name="${control}"], textarea[name="${control}"]`).scrollIntoView()
        return
      }

      try {
        this.errorMsg = null
        const entry = new contracts.GroupContract({
          authorizations: [Events.CanModifyAuths.dummyAuth()],
          groupName: this.form.groupName,
          sharedValues: this.form.sharedValues,
          changePercentage: this.form.changePercentage,
          memberApprovalPercentage: this.form.memberApprovalPercentage,
          memberRemovalPercentage: this.form.memberRemovalPercentage,
          incomeProvided: this.form.incomeProvided,
          contributionPrivacy: this.form.contributionPrivacy,
          founderUsername: this.$store.state.loggedIn.name,
          founderIdentityContractId: this.$store.state.loggedIn.identityContractId
        })
        const hash = entry.toHash()
        // TODO: convert this to SBL
        Vue.events.$once(hash, (contractId, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          // Take them to the invite group members page.
          this.$router.push({path: '/invite'})
        })
        // TODO: convert this to SBL
        await backend.publishLogEntry(hash, entry)
        // add to vuex and monitor this contract for updates
        await this.$store.dispatch('syncContractWithServer', hash)
      } catch (error) {
        console.error(error)
        this.form.errorMsg = L('Failed to Create Group')
      }
    }
  },
  data () {
    return {
      form: {
        groupName: null,
        sharedValues: null,
        changePercentage: 80,
        memberApprovalPercentage: 80,
        memberRemovalPercentage: 80,
        incomeProvided: null,
        contributionPrivacy: 'Very Private',
        errorMsg: null
      },
      ephemeral: {
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      },
      // TODO remove this, only for testing out VueAssistant
      comp1,
      comp2
    }
  }
}
</script>
