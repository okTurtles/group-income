<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <form ref="form"
        name="CreateGroupForm"
        @submit.prevent="submit">
          <div class="tile is-ancestor">
            <div class="tile is-4 is-vertical question-group">
                <div class="tile notification">
                  <p class="title"><i18n>What is your Group's Name?</i18n></p>
                  <input type="text" v-validate data-vv-as="Group Name" data-vv-rules="required" name="groupName" v-model="groupName" class="dotted">
                  <span v-show="errors.has('groupName')" class="help is-danger">{{ errors.first('groupName') }}</span>
                </div>
                <div class="tile notification is-info">
                  <p class="title"><i18n>What are your shared values?</i18n></p>
                  <textarea class="dotted" v-validate data-vv-as="Shared Values" data-vv-rules="required" name="sharedValues" v-model="sharedValues"></textarea>
                  <span v-show="errors.has('sharedValues')" class="help is-danger">{{ errors.first('sharedValues') }}</span>
                </div>
                <div class="tile notification">
                  <p class="title"><i18n>What percentage of members are required to change the rules?</i18n></p>
                  <p class="title percentage">{{changePercentage}}%</p>
                  <input type="range" v-validate data-vv-as="Percentage to change rules" data-vv-rules="between:1,100"  min="0" max="100" name="changePercentage" v-model="changePercentage">
                  <span v-show="errors.has('changePercentage')" class="help is-danger">The Percentage to change rules field must be between 1% and 100%</span>
                </div>
            </div>
            <div class="tile is-4 is-vertical question-group">
              <div class="tile notification is-warning">
                <p class="title"><i18n>Is your group open to new members?</i18n></p>
                <p class="title" v-show="openMembership">Yes</p>
                <p class="title" v-show="!openMembership">No</p>
                <label class="switch">
                  <input type="checkbox" name="openMembership" v-model="openMembership">
                  <div class="slider round"></div>
                </label>
              </div>
              <div class="tile notification">
                <p class="title"><i18n>How many members should it take to approve a new member?</i18n></p>
                <p class="title">{{memberApprovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Approval Percentage" v-validate data-vv-rules="between:1,100" name="memberApprovalPercentage" v-model="memberApprovalPercentage">
                <span v-show="errors.has('memberApprovalPercentage')" class="help is-danger">The Member Approval Percentage field must be between 1% and 100%.</span>
              </div>
              <div class="tile notification">
                <p class="title"><i18n>How many members should it take to remove a member?</i18n></p>
                <p class="title">{{memberRemovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Removal Percentage" v-validate data-vv-rules="between:1,100" name="memberRemovalPercentage" v-model="memberRemovalPercentage">
                <span v-show="errors.has('memberRemovalPercentage')" class="help is-danger">The Member Removal Percentage field must be between 1% and 100%.</span>
              </div>
            </div>
            <div class="tile is-4 is-vertical question-group">
              <div class="tile notification">
                <p class="title"><i18n>How much income will your group seek to provide</i18n></p>

                <i class="fa fa-usd symbol" aria-hidden="true" ></i><input type="text" data-vv-as="Income Provided" v-validate data-vv-rules="decimal:2" name="incomeProvided" v-model="incomeProvided" class="dotted">
                <span v-show="errors.has('incomeProvided')" class="help is-danger">The Income Provided field must be a numeric currency amount and may contain 2 decimal points.</span>

              </div>
              <div class="tile notification is-danger">
                <p class="title"><i18n>How transparent should your group be about who contributes?</i18n></p>
                <p class="select">
                  <select v-validate data-vv-rules="required" data-vv-as="Conrtibution Privacy" name="contributionPrivacy" v-model="contributionPrivacy">
                    <option value="">Select an option</option>
                    <option value="Very Private">Very Private</option>
                  </select>
                </p>
                <span v-show="errors.has('contributionPrivacy')" class="help is-danger">{{ errors.first('contributionPrivacy') }}</span>
              </div>
              <div class="tile">
                <div class="center">
                  <div id="successMsg" v-if="created" class="help is-success">Success</div>
                <button class="button is-success center" type="submit" :disabled="errors.any() || !fields.passed()">Create Group</button>
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
import backend from '../js/backend'
import {Events} from '../../../shared/events'

export default {
  name: 'CreateGroupView',
  methods: {
    submit: function () {
      this.$validator.validateAll()
        .then(async function () {
          let entry = new Events.Group({
            groupName: this.groupName,
            sharedValue: this.sharedValue,
            changePercentage: this.changePercentage,
            openMembership: this.openMembership,
            memberApprovalPercentage: this.memberApprovalPercentage,
            memberRemovalPercentage: this.memberRemovalPercentage,
            incomeProvided: this.incomeProvided,
            contributionPrivacy: this.contributionPrivacy,
            founderHashKey: 'alsdfjlskdfjaslkfjsldkfj'
          })
          let hash = entry.toHash()
          await backend.subscribe(hash)
          let res = await backend.publishLogEntry(hash, entry, hash)
          if (!res.ok) {
            console.error('failed to create group:', res.text)
          } else {
            this.created = true
            console.log('group created. server response:', res.body)
          }
        }.bind(this))
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
      created: false
    }
  }
}
</script>
