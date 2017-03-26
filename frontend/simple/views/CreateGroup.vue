<template>
  <section class="section">
    <!-- TODO: use Bulma's .field -->
    <!-- TODO: center using .centered like SignUp.vue -->
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <form ref="form"
        name="CreateGroupForm"
        @submit.prevent="submit">
          <div class="columns is-multiline">
            <div class="column is-one-third has-text-centered create-group">
              <p class="title is-4"><i18n>Describe your group</i18n></p>
              <div class="box">
                <p class="title is-5"><i18n>What is your Group's Name?</i18n></p>
                <input type="text" v-validate data-vv-as="Group Name" data-vv-rules="required" name="groupName" v-model="groupName" class="input">
                <i18n v-if="errors.has('groupName')" data-control='groupName' class="help is-danger">{{ errors.first('groupName') }}</i18n>
              </div>
              <div class="box">
                <p class="title is-5"><i18n>What are your shared values?</i18n></p>
                <textarea class="textarea" v-validate data-vv-as="Shared Values" data-vv-rules="required" name="sharedValues" v-model="sharedValues"></textarea>
                <i18n v-if="errors.has('sharedValues')" data-control='sharedValues' class="help is-danger">{{ errors.first('sharedValues') }}</i18n>
              </div>
              <div class="box">
                <p class="title is-5"><i18n>What percentage of members are required to change the rules?</i18n></p>
                <p class="title is-3 percentage">{{changePercentage}}%</p>
                <input type="range" v-validate data-vv-as="Percentage to change rules" data-vv-rules="between:1,100"  min="0" max="100" name="changePercentage" v-model="changePercentage">
                <i18n v-if="errors.has('changePercentage')" data-control='changePercentage' class="help is-danger">The Percentage to change rules field must be between 1% and 100%</i18n>
                <!-- this is used for nightmare and only rendered in 'development' mode. Without this nightmare has trouble triggering the events for vue that updates the model when values are set -->
                <input v-if="dev" type="text" v-model="changePercentage" name="proxyChangePercentage" style="opacity:0; position: absolute;">
              </div>
            </div>
            <div class="column is-one-third has-text-centered create-group">
              <p class="title is-4"><i18n>Member relationships</i18n></p>
              <div class="box">
                <p class="title is-5"><i18n>How many members should it take to approve a new member?</i18n></p>
                <p class="title is-3">{{memberApprovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Approval Percentage" v-validate data-vv-rules="between:1,100" name="memberApprovalPercentage" v-model="memberApprovalPercentage">
                <i18n v-if="errors.has('memberApprovalPercentage')" data-control='memberApprovalPercentage' class="help is-danger">The Member Approval Percentage field must be between 1% and 100%.</i18n>
                <!-- this is used for nightmare and only rendered in 'development' mode. Without this nightmare has trouble triggering the events for vue that updates the model when values are set -->
                <input v-if="dev" type="text" v-model="memberApprovalPercentage" name="proxyMemberApprovalPercentage" style="opacity:0; position: absolute;">
              </div>
              <div class="box">
                <p class="title is-5"><i18n>How many members should it take to remove a member?</i18n></p>
                <p class="title is-3">{{memberRemovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Removal Percentage" v-validate data-vv-rules="between:1,100" name="memberRemovalPercentage" v-model="memberRemovalPercentage">
                <i18n v-if="errors.has('memberRemovalPercentage')" data-control='memberRemovalPercentage' class="help is-danger">The Member Removal Percentage field must be between 1% and 100%.</i18n>
                <!-- this is used for nightmare and only rendered in 'development' mode. Without this nightmare has trouble triggering the events for vue that updates the model when values are set -->
                <input v-if="dev" type="text" v-model="memberRemovalPercentage" name="proxyMemberRemovalPercentage" style="opacity:0; position: absolute;">
              </div>
            </div>
            <div class="column is-one-third has-text-centered create-group">
              <p class="title is-4"><i18n>Resource allocation</i18n></p>
              <div class="box">
                <p class="title is-5"><i18n>How much income will your group seek to provide</i18n></p>
                <div class="field has-addons">
                  <p class="control">
                    <span class="select">
                      <select>
                        <option>USD</option>
                        <option>BTC</option>
                        <option>EUR</option>
                      </select>
                    </span>
                  </p>
                  <p class="control">
                    <input class="input" type="text" name="incomeProvided"
                      placeholder="Amount of money"
                      data-vv-as="Income Provided"
                      v-validate data-vv-rules="decimal:2"
                      v-model="incomeProvided"
                    >
                  </p>
                </div>
                <i18n v-if="errors.has('incomeProvided')" data-control="incomeProvided" class="help is-danger">The Income Provided field must be a numeric currency amount and may contain 2 decimal points.</i18n>
              </div>
              <div class="box" >
                <p class="title is-5"><i18n>How transparent should your group be about who contributes?</i18n></p>
                <p class="select">
                  <select v-validate data-vv-rules="required" data-vv-as="Contribution Privacy" name="contributionPrivacy" v-model="contributionPrivacy">
                    <option value="">Select an option</option>
                    <option value="Very Private">Very Private</option>
                  </select>
                </p>
                <i18n v-if="errors.has('contributionPrivacy')" data-control="contributionPrivacy" class="help is-danger">{{ errors.first('contributionPrivacy') }}</i18n>
              </div>
              <div class="has-text-centered button-box">
                <div id="successMsg" v-if="created" class="created"><i18n>Success</i18n></div>
                <button class="button is-success is-large" v-if="!created" type="submit"><i18n>Create Group</i18n></button>
                <a class="button is-warning is-large" id="nextButton" v-if="created" v-on:click="next"><i18n>Next: Invite Group Members</i18n></a>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>
<script>
import Vue from 'vue'
import backend from '../js/backend'
import * as Events from '../../../shared/events'

export default {
  name: 'CreateGroupView',
  methods: {
    next: function () {
      this.$router.push({path: '/invite'})
    },
    submit: async function () {
      let success
      try {
        success = await this.$validator.validateAll()
      } catch (ex) {
        let firsErr = document.querySelector('span.help.is-danger')
        let control = firsErr.dataset.control
        let ctrlEl = document.querySelector(`input[name="${control}"], textarea[name="${control}"]`)
        ctrlEl.focus()
        ctrlEl.scrollIntoView()
      }
      if (success) {
        let entry = new Events.GroupContract({
          authorizations: [Events.CanModifyAuths.dummyAuth()],
          groupName: this.groupName,
          sharedValues: this.sharedValues,
          changePercentage: this.changePercentage,
          memberApprovalPercentage: this.memberApprovalPercentage,
          memberRemovalPercentage: this.memberRemovalPercentage,
          incomeProvided: this.incomeProvided,
          contributionPrivacy: this.contributionPrivacy,
          founderUsername: this.$store.state.loggedIn
        })
        let hash = entry.toHash()
        await backend.subscribe(hash)
        Vue.events.$once(hash, (contractId, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
        })
        await backend.publishLogEntry(hash, entry)
        let founder = new Events.AcknowledgeFounder({ username: this.$store.state.loggedIn }, hash)
        await backend.publishLogEntry(hash, founder)
        this.created = true
      }
    }
  },
  data: function () {
    return {
      groupName: null,
      sharedValues: null,
      changePercentage: 80,
      memberApprovalPercentage: 80,
      memberRemovalPercentage: 80,
      incomeProvided: null,
      contributionPrivacy: 'Very Private',
      created: false,
      // this determines whether or not to render proxy components for nightmare
      dev: process.env.NODE_ENV === 'development'
    }
  }
}
</script>
