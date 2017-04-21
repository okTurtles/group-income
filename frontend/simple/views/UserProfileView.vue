<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-one-third"></div>
      <div class="column" >
        <form ref="form"
              name="ProfileForm"
              @submit.prevent="save"
        >
          <div class="panel">
            <p class="panel-heading">
              <i18n>Profile Attributes</i18n>
            </p>
            <div class="panel-block">
              <figure class="media-left">
                <p class="image is-64x64">
                  <img v-bind:src="$store.getters.picture">
                </p>
              </figure>
              <div class="media-content">
                <strong><i18n>Profile Picture</i18n>:</strong> <input class="input" type="text" v-model="edited.picture" placeholder="http://">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>First Name</i18n>:</strong> <input class="input" type="text" v-model="edited.firstName" placeholder="First Name">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Last Name</i18n>:</strong> <input class="input" type="text" v-model="edited.lastName" placeholder="Last Name">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Email</i18n>:</strong> <input class="input" type="text" v-validate data-vv-rules="email" v-model="edited.email" placeholder="Email">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Bio</i18n>:</strong> <textarea type="text" class="textarea" v-model="edited.bio" placeholder="Bio"></textarea>
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Address Line 1</i18n>:</strong> <input class="input" type="text" v-model="edited.addressLn1" placeholder="Address Line 1">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Address Line 2</i18n>:</strong> <input class="input" type="text" v-model="edited.addressLn2" placeholder="Address Line 2">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Address Line 3</i18n>:</strong> <input class="input" type="text" v-model="edited.addressLn3" placeholder="Address Line 3">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>City</i18n>:</strong> <input class="input" type="text" v-model="edited.addressCity" placeholder="City">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>State/Province</i18n>:</strong> <input class="input" type="text" v-model="edited.addressStPr" placeholder="State/Province">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Country</i18n>:</strong> <input class="input" type="text" v-model="edited.addressCountry" placeholder="Country">
              </div>
            </div>
          </div>
          <div class="has-text-centered button-box">
            <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
            <div id="successMsg" v-if="profileSaved" class="created"><i18n>Success</i18n></div>
            <button class="button is-success is-large" type="submit"><i18n>Save Profile</i18n></button>
          </div>
        </form>
        <br>
        <form ref="form"
              name="GroupProfileForm"
              @submit.prevent="saveGroupProfile"
        >
          <div class="panel">
            <p class="panel-heading">
              <i18n> Group Profile Attributes</i18n>
            </p>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Select Group</i18n>:</strong>
                <span class="select">
                  <select v-model="currentGroupContractId" v-on:change="changeGroup">
                    <option v-for="group in $store.getters.groupsByName" v-bind:value="group.contractId">{{group.groupName}}</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="panel-block" v-if="currentGroupContractId">
              <div class="media-content">
                <strong><i18n>PaymentType</i18n>: </strong>
                <span class="select" type="text">
                  <select v-model="editedGroupProfile.paymentMethod">
                    <option></option>
                    <option>Bitcoin</option>
                    <option>Amex</option>
                    <option>Visa</option>
                    <option>Blood</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="panel-block" v-if="currentGroupContractId">
              <div class="media-content">
                <strong><i18n>Contribution Amount</i18n>:</strong>
                <input class="input" type="text" name="contributionAmount"
                       placeholder="Contribution Amount"
                       data-vv-as="Contribution Amount"
                       v-validate data-vv-rules="decimal:2"
                       v-model="editedGroupProfile.contributionAmount"
                >
              </div>
            </div>
          </div>
          <div class="has-text-centered button-box">
            <div id="groupErrorMsg" v-if="groupErrorMsg" class="help is-danger">{{groupErrorMsg}}</div>
            <div id="groupSuccessMsg" v-if="groupProfileSaved" class="created"><i18n>Success</i18n></div>
            <button class="button is-success is-large" v-if="currentGroupContractId"><i18n>Save Group Profile</i18n></button>
          </div>
        </form>
      </div>
      <div class="column is-one-third"></div>
    </div>
  </section>
</template>
<script>
import backend from '../js/backend'
import * as Events from '../../../shared/events'
import {latestContractState} from '../js/state'
export default {
  name: 'UserProfileView',
  computed: {
    attributes () {
      return this.$store.state[this.$store.getters.identity].attributes
    }
  },
  data () {
    return {
      edited: {
        picture: this.$store.state[this.$store.getters.identity].attributes.picture,
        bio: this.$store.state[this.$store.getters.identity].attributes.bio,
        firstName: this.$store.state[this.$store.getters.identity].attributes.firstName,
        lastName: this.$store.state[this.$store.getters.identity].attributes.lastName,
        email: this.$store.state[this.$store.getters.identity].attributes.email,
        addressLn1: this.$store.state[this.$store.getters.identity].attributes.addressLn1,
        addressLn2: this.$store.state[this.$store.getters.identity].attributes.addressLn2,
        addressLn3: this.$store.state[this.$store.getters.identity].attributes.addressLn3,
        addressStPr: this.$store.state[this.$store.getters.identity].attributes.addressStPr,
        addressCity: this.$store.state[this.$store.getters.identity].attributes.addressCity,
        addressCountry: this.$store.state[this.$store.getters.identity].attributes.addressCountry
      },
      editedGroupProfile: {
        paymentMethod: null,
        contributionAmount: null
      },
      currentGroupContractId: null,
      errorMsg: null,
      groupErrorMsg: null,
      groupProfileSaved: false,
      profileSaved: false
    }
  },
  methods: {
    async save () {
      try {
        this.profileSaved = false
        for (let key of Object.keys(this.edited)) {
          if (this.edited[key] && this.edited[key] !== this.attributes[key]) {
            let identity = await backend.latestHash(this.$store.getters.identity)
            let attribute = new Events.SetAttribute({attribute: {name: key, value: this.edited[key]}}, identity)
            await backend.publishLogEntry(this.$store.getters.identity, attribute)
          }
        }
        this.profileSaved = true
      } catch (ex) {
        console.log(ex)
        this.errorMsg = 'Failed to Save Profile'
      }
    },
    changeGroup () {
      let groupProfile = this.$store.state[this.currentGroupContractId].profiles[this.$store.state.loggedIn] || {}
      for (let key of Object.keys(this.editedGroupProfile)) { this.editedGroupProfile[key] = groupProfile[key] }
    },
    async saveGroupProfile () {
      try {
        this.groupProfileSaved = false
        let state = await latestContractState(this.currentGroupContractId)
        let attributes = state.profiles[this.$store.state.loggedIn] || {}
        for (let key of Object.keys(this.editedGroupProfile)) {
          if (this.editedGroupProfile[key] && this.editedGroupProfile[key] !== attributes[key]) {
            let latest = await backend.latestHash(this.currentGroupContractId)
            let adjustment = new Events.ProfileAdjustment({username: this.$store.state.loggedIn, name: key, value: this.editedGroupProfile[key]}, latest)
            await backend.publishLogEntry(this.currentGroupContractId, adjustment)
          }
        }
        this.groupProfileSaved = true
      } catch (ex) {
        console.log(ex)
        this.groupErrorMsg = 'Failed to Save Profile'
      }
    }
  }
}
</script>
