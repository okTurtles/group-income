<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column" >
        <form ref="ProfileForm"
              name="ProfileForm"
              @submit.prevent="save"
              data-vv-scope="ProfileForm"
        >
          <p
                  class="notification is-success has-text-centered"
                  v-if="profileSaved"
                  id="ProfileSaveSuccess"
          >
            <i class='notification-icon fa fa-check'></i>
            <i18n>Profile saved successfully!</i18n>
          </p>
          <p
                  class="notification is-danger has-text-centered"
                  v-if="errorMsg"
          >
            <i class='notification-icon fa fa-exclamation-triangle'></i>
            {{errorMsg}}
          </p>
          <div class="panel">
            <p class="panel-heading">
              <i18n>Profile Attributes</i18n>
            </p>
            <div class="panel-block">
              <figure class="media-left">
                <p class="image is-64x64">
                  <img v-bind:src="$store.getters.currentUserIdentityContract.attributes.picture">
                </p>
              </figure>
              <div class="media-content">
                <strong><i18n>Profile Picture</i18n>:</strong> <input class="input" type="text" v-validate data-vv-rules="url" name="profilePicture" v-model="edited.picture" placeholder="http://">
                <i18n v-if="errors.has('ProfileForm.profilePicture')" class="help is-danger">
                  The profile picture must be a valid url
                </i18n>
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Display Name</i18n>:</strong> <input class="input" name="displayName" type="text" v-model="edited.displayName" placeholder="Name">
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Email</i18n>:</strong> <input class="input" name="profileEmail" type="text" v-validate data-vv-rules="email" v-model="edited.email" placeholder="Email">
                <i18n v-if="errors.has('ProfileForm.profileEmail')" class="help is-danger">Not an email</i18n>
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Bio</i18n>:</strong> <textarea type="text" class="textarea" name="bio" v-model="edited.bio" placeholder="Bio"></textarea>
              </div>
            </div>
          </div>
          <div class="has-text-centered button-box">
            <button class="button is-success is-large" id='SaveProfileButton' :disabled="errors.any('ProfileForm')" type="submit"><i18n>Save Profile</i18n></button>
          </div>
        </form>
        <br>
        <form ref="GroupProfileForm"
              name="GroupProfileForm"
              @submit.prevent="saveGroupProfile"
              data-vv-scope="GroupProfileForm"
        >
          <p
                  class="notification is-success has-text-centered"
                  v-if="groupProfileSaved"
          >
            <i class='notification-icon fa fa-check'></i>
            <i18n>Group Profile saved successfully!</i18n>
          </p>
          <p
                  class="notification is-danger has-text-centered"
                  v-if="groupErrorMsg"
          >
            <i class='notification-icon fa fa-exclamation-triangle'></i>
            {{groupErrorMsg}}
          </p>
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
                    <option>Paypal</option>
                  </select>
                </span>
              </div>
            </div>
            <div class="panel-block" v-if="currentGroupContractId">
              <div class="media-content">
                <strong><i18n>Contribution Amount</i18n>:</strong>
                <div class="field has-addons">
                  <p class="control">
                    <!--- TODO: Make this a real field-->
                    <span class="select">
                      <select v-model="editedGroupProfile.contributionCurrency">
                        <option>USD</option>
                        <option>BTC</option>
                        <option>EUR</option>
                      </select>
                    </span>
                  </p>
                  <p class="control">
                    <input class="input" type="text" name="contributionAmount"
                           placeholder="Contribution Amount"
                           data-vv-as="Contribution Amount"
                           v-validate data-vv-rules="decimal:2"
                           v-model="editedGroupProfile.contributionAmount"
                    >
                  </p>
                </div>
                <i18n v-if="errors.has('GroupProfileForm.contributionAmount')" data-control="incomeProvided" class="help is-danger">
                  The Contribution Amount must be a numeric currency amount and may contain 2 decimal points.
                </i18n>
              </div>
            </div>
            <div class="panel-block" v-if="currentGroupContractId">
              <div class="media-content">
                <strong><i18n>Receiving Limit</i18n>:</strong>
                <div class="field has-addons">
                  <p class="control">
                    <!--- TODO: Make this a real field-->
                    <span class="select">
                      <select v-model="editedGroupProfile.receivingLimitCurrency">
                        <option>USD</option>
                        <option>BTC</option>
                        <option>EUR</option>
                      </select>
                    </span>
                  </p>
                  <p class="control">
                    <input class="input" type="text" name="receivingLimit"
                           placeholder="Receiving Limit"
                           data-vv-as="Receiving Limit"
                           v-validate data-vv-rules="decimal:2"
                           v-model="editedGroupProfile.receivingLimit"
                    >
                  </p>
                </div>
                <i18n v-if="errors.has('GroupProfileForm.receivingLimit')" data-control="incomeProvided" class="help is-danger">
                  The Receiving Limit must be a numeric currency amount and may contain 2 decimal points.
                </i18n>
              </div>
            </div>
          </div>
          <div class="has-text-centered button-box">
            <button class="button is-success is-large" :disabled="errors.any('GroupProfileForm')" v-if="currentGroupContractId"><i18n>Save Group Profile</i18n></button>
          </div>
        </form>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>
<script>
import backend from '../js/backend'
import * as Events from '../../../shared/events'
import {latestContractState} from '../js/state'
import L from '../js/translations'
export default {
  name: 'UserProfileView',
  computed: {
    attributes () {
      return this.$store.getters.currentUserIdentityContract.attributes
    }
  },
  data () {
    return {
      edited: {
        picture: this.$store.getters.currentUserIdentityContract.attributes.picture,
        bio: this.$store.getters.currentUserIdentityContract.attributes.bio,
        displayName: this.$store.getters.currentUserIdentityContract.attributes.displayName,
        email: this.$store.getters.currentUserIdentityContract.attributes.email
      },
      editedGroupProfile: {
        paymentMethod: null,
        contributionAmount: null,
        contributionCurrency: null,
        receivingLimit: null,
        receivingLimitCurrency: null
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
            let identityContractLatest = await backend.latestHash(this.$store.state.loggedIn.identityContractId)
            let attribute = new Events.HashableIdentitySetAttribute({attribute: {name: key, value: this.edited[key]}}, identityContractLatest)
            await backend.publishLogEntry(this.$store.state.loggedIn.identityContractId, attribute)
          }
        }
        this.profileSaved = true
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Save Profile')
      }
    },
    changeGroup () {
      let groupProfile = this.$store.state[this.currentGroupContractId].profiles[this.$store.state.loggedIn.name] || {}
      for (let key of Object.keys(this.editedGroupProfile)) { this.editedGroupProfile[key] = groupProfile[key] }
    },
    async saveGroupProfile () {
      try {
        this.groupProfileSaved = false
        let state = await latestContractState(this.currentGroupContractId)
        let attributes = state.profiles[this.$store.state.loggedIn.name] || {}
        for (let key of Object.keys(this.editedGroupProfile)) {
          if (this.editedGroupProfile[key] && this.editedGroupProfile[key] !== attributes[key]) {
            let groupContractLatest = await backend.latestHash(this.currentGroupContractId)
            let adjustment = new Events.HashableGroupSetGroupProfile({username: this.$store.state.loggedIn.name, name: key, value: this.editedGroupProfile[key]}, groupContractLatest)
            await backend.publishLogEntry(this.currentGroupContractId, adjustment)
          }
        }
        this.groupProfileSaved = true
      } catch (ex) {
        console.log(ex)
        this.groupErrorMsg = L('Failed to Save Group Profile')
      }
    }
  }
}
</script>
