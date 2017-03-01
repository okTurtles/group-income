<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <form ref="form"
        name="CreateGroupForm"
        @submit.prevent="submit">
          <div class="columns is-multiline">
            <div class="column is-one-third center create-group">
              <p class="title is-2"><i18n>Describe your group</i18n></p>
              <div class="box">
                <p class="title is-3"><i18n>What is your Group's Name?</i18n></p>
                <input type="text" v-validate data-vv-as="Group Name" data-vv-rules="required" name="groupName" v-model="groupName" class="input">
                <span v-if="errors.has('groupName')" data-control='groupName' class="help is-danger">{{ errors.first('groupName') }}</span>
              </div>
              <div class="box">
                <p class="title is-3"><i18n>What are your shared values?</i18n></p>
                <textarea class="textarea" v-validate data-vv-as="Shared Values" data-vv-rules="required" name="sharedValues" v-model="sharedValues"></textarea>
                <span v-if="errors.has('sharedValues')" data-control='sharedValues' class="help is-danger">{{ errors.first('sharedValues') }}</span>
              </div>
              <div class="box">
                <p class="title is-3"><i18n>What percentage of members are required to change the rules?</i18n></p>
                <p class="title is-3 percentage">{{changePercentage}}%</p>
                <input type="range" v-validate data-vv-as="Percentage to change rules" data-vv-rules="between:1,100"  min="0" max="100" name="changePercentage" v-model="changePercentage">
                <span v-if="errors.has('changePercentage')" data-control='changePercentage' class="help is-danger"><i18n>The Percentage to change rules field must be between 1% and 100%</i18n></span>
                <!-- this is used for nightmare and only rendered in 'development' mode. Without this nightmare has trouble triggering the events for vue that updates the model when values are set -->
                <input v-if="dev" type="text" v-model="changePercentage" name="proxyChangePercentage" style="opacity:0; position: absolute;">
              </div>
            </div>
            <div class="column is-one-third center create-group">
              <p class="title is-2"><i18n>Member relationships</i18n></p>
              <div class="box">
                <p class="title is-3"><i18n>Is your group open to new members?</i18n></p>
                <p class="title is-3" v-show="openMembership"><i18n>Yes</i18n></p>
                <p class="title is-3" v-show="!openMembership"><i18n>No</i18n></p>
                <label class="switch">
                  <input type="checkbox" name="openMembership" v-model="openMembership">
                  <div class="slider round"></div>
                </label>
              </div>
              <div class="box">
                <p class="title is-3"><i18n>How many members should it take to approve a new member?</i18n></p>
                <p class="title is-3">{{memberApprovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Approval Percentage" v-validate data-vv-rules="between:1,100" name="memberApprovalPercentage" v-model="memberApprovalPercentage">
                <span v-if="errors.has('memberApprovalPercentage')" data-control='memberApprovalPercentage' class="help is-danger"><i18n>The Member Approval Percentage field must be between 1% and 100%.</i18n></span>
                <!-- this is used for nightmare and only rendered in 'development' mode. Without this nightmare has trouble triggering the events for vue that updates the model when values are set -->
                <input v-if="dev" type="text" v-model="memberApprovalPercentage" name="proxyMemberApprovalPercentage" style="opacity:0; position: absolute;">
              </div>
              <div class="box">
                <p class="title is-3"><i18n>How many members should it take to remove a member?</i18n></p>
                <p class="title is-3">{{memberRemovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Removal Percentage" v-validate data-vv-rules="between:1,100" name="memberRemovalPercentage" v-model="memberRemovalPercentage">
                <span v-if="errors.has('memberRemovalPercentage')" data-control='memberRemovalPercentage' class="help is-danger"><i18n>The Member Removal Percentage field must be between 1% and 100%.</i18n></span>
                <!-- this is used for nightmare and only rendered in 'development' mode. Without this nightmare has trouble triggering the events for vue that updates the model when values are set -->
                <input v-if="dev" type="text" v-model="memberRemovalPercentage" name="proxyMemberRemovalPercentage" style="opacity:0; position: absolute;">
              </div>
            </div>
            <div class="column is-one-third center create-group">
              <p class="title is-2"><i18n>Resource allocation</i18n></p>
              <div class="box">
                <p class="title is-3"><i18n>How much income will your group seek to provide</i18n></p>
                <p class="control has-icon">
                  <input type="text" data-vv-as="Income Provided" v-validate data-vv-rules="decimal:2" name="incomeProvided" v-model="incomeProvided" class="input">
                  <span class="icon">
                    <i class="fa fa-usd" aria-hidden="true" ></i>
                  </span>
                </p>
                <span v-if="errors.has('incomeProvided')" data-control="incomeProvided" class="help is-danger"><i18n>The Income Provided field must be a numeric currency amount and may contain 2 decimal points.</i18n></span>
              </div>
              <div class="box" >
                <p class="title is-3"><i18n>How transparent should your group be about who contributes?</i18n></p>
                <p class="select">
                  <select v-validate data-vv-rules="required" data-vv-as="Conrtibution Privacy" name="contributionPrivacy" v-model="contributionPrivacy">
                    <option value="">Select an option</option>
                    <option value="Very Private">Very Private</option>
                  </select>
                </p>
                <span v-if="errors.has('contributionPrivacy')" data-control="contributionPrivacy" class="help is-danger">{{ errors.first('contributionPrivacy') }}</span>
              </div>
              <div class="center button-box">
                <div class="center">
                  <div id="successMsg" v-if="created" class="created"><i18n>Success</i18n></div>
                  <button class="button is-success is-large center" v-if="!created" type="submit"><i18n>Create Group</i18n></button>
                  <a class="button is-warning is-large center" id="nextButton" v-if="created" v-on:click="next"><i18n>Next: Invite Group Members</i18n></a>
                </div>
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
          sharedValue: this.sharedValue,
          changePercentage: this.changePercentage,
          openMembership: this.openMembership,
          memberApprovalPercentage: this.memberApprovalPercentage,
          memberRemovalPercentage: this.memberRemovalPercentage,
          incomeProvided: this.incomeProvided,
          contributionPrivacy: this.contributionPrivacy,
          founderHashKey: this.$store.state.loggedIn
        })
        let hash = entry.toHash()
        await backend.subscribe(hash)
        Vue.events.$once(hash, (contractId, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          this.$store.commit('setPosition', hash)
        })
        let res = await backend.publishLogEntry(hash, entry)
        if (!res.ok) {
          console.error('failed to create group contract:', res.text)
        } else {
          this.created = true
          console.log('group contract created. server response:', res.body)
        }
      }
    }
  },
  data: function () {
    return {
      groupName: null,
      sharedValues: null,
      changePercentage: 0,
      openMembership: false,
      memberApprovalPercentage: 0,
      memberRemovalPercentage: 0,
      incomeProvided: null,
      contributionPrivacy: '',
      created: false,
      // this determines whether or not to render proxy components for nightmare
      dev: process.env.NODE_ENV === 'development'
    }
  }
}
</script>
