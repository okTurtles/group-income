<template>
  <section class="section">
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
                  <span v-show="errors.has('changePercentage')" class="help is-danger">{{ errors.first('changePercentage') }}</span>
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
                <span v-show="errors.has('memberApprovalPercentage')" class="help is-danger">{{ errors.first('memberApprovalPercentage') }}</span>
              </div>
              <div class="tile notification">
                <p class="title"><i18n>How many members should it take to remove a member?</i18n></p>
                <p class="title">{{memberRemovalPercentage}}%</p>
                <input type="range" min="0" max="100" data-vv-as="Member Removal Percentage" v-validate data-vv-rules="between:1,100" name="memberRemovalPercentage" v-model="memberRemovalPercentage">
                <span v-show="errors.has('memberRemovalPercentage')" class="help is-danger">{{ errors.first('memberRemovalPercentage') }}</span>
              </div>
            </div>
            <div class="tile is-4 is-vertical question-group">
              <div class="tile notification">
                <p class="title"><i18n>How much income will your group seek to provide</i18n></p>

                <i class="fa fa-usd symbol" aria-hidden="true" ></i><input type="text" data-vv-as="Incomed Provided" v-validate data-vv-rules="decimal:2" name="incomeProvided" v-model="incomeProvided" class="dotted">
                <span v-show="errors.has('incomeProvided')" class="help is-danger">{{ errors.first('incomeProvided') }}</span>

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
                <button class="button is-success center" type="submit" :disabled="errors.any() || !fields.passed()">Next: Invite Members</button>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>
<style scoped>
  .is-danger .is-danger{
    color: white;
  }
  .symbol{
    vertical-align: bottom;
    margin: 10px 0;
  }
  .select:after {
    border: 1px solid #69707a;
    border-right: 0;
    border-top: 0;
  }
  .center {
    margin: auto auto
  }
  .percentage{
     height: 26px;
  }
  .question-group .notification {
    display: block;
    padding: 30px;
    margin: 10px 5px;
    text-align: center;
  }
  .dotted{
    vertical-align: bottom;
    background-color: transparent;
    border: none;
    margin: 10px;
    padding: 10px 10px 0 10px;
    border-bottom: 0.2rem dashed #69707a;
    font-size: 20px;
    width: 70%;
  }
  .is-info textarea.dotted{
    border: 0.2rem dashed white;
    color: white;
  }

  .percentage{
    background-color: transparent;
    color: inherit;
    border: none;
    outline:none;
    font-size: 28px;
    border: 1px;
  }

  textarea.dotted{
    border: 0.2rem dashed #69707a;
    height: 150px;
    width: 70%;
  }
  .notfication.is-info textarea.dotted{
    color: white;
    border-color: white;
  }
  input[type=range]{
    background-color: blue
  }
  /* Slider toggle Styles */
  /* The switch - the box around the slider */
  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
  }

  /* Hide default HTML checkbox */
  .switch input {display:none;}

  /* The slider */
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
  }

  input:checked + .slider {
    background-color: #2196F3;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #2196F3;
  }

  input:checked + .slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
  }
  /* end slider toggle styles */
  /* rounded range controls */
  input[type=range] {
    -moz-appearance: none;
    -webkit-appearance: none;
    background-color: #ccc;
    border-radius: 34px;
    padding: 4px;
    height: 34px;
  }

  input[type=range]:focus {
    outline: none;
  }

  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    border-radius: 50%;
    height: 26px;
    width: 26px;
    background: #ffffff;
  }

  input[type=range]::-moz-range-thumb {
    -moz-appearance: none;
    border-radius: 50%;
    height: 26px;
    width: 26px;
    background: #ffffff;
    border: none;
  }

  input[type=range]::-moz-range-track {
    background: transparent;
    border-color: transparent;
    color: transparent;
  }
</style>

<script>
import SignUp from './SignUp.vue'
import {loginLogout} from '../js/mixins'
import {makeGroup} from '../../../shared/functions'

export default {
  name: 'CreateGroupView',
  methods: {
    submit: function(){
      this.$validator.validateAll()
        .then(() => {
           let group = makeGroup(
             this.groupName,
             this.sharedValue,
             this.changePercentage,
             this.openMembership,
             this.memberApprovalPercentage,
             this.memberRemovalPercentage,
             this.incomeProvided,
             this.contributionPrivacy,
             this.$store.state.loggedInUser
           )
           this.$store.dispatch('createGroup', group)
        })
      }
  },
  data: function () {
    return {
      groupName: null ,
      sharedValues: null,
      changePercentage: 0,
      openMembership: false,
      memberApprovalPercentage: 0,
      memberRemovalPercentage: 0,
      incomeProvided: null,
      contributionPrivacy: ""
    }
  }
}
</script>
