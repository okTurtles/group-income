<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column" >
        <form ref="ProfileForm"
              name="ProfileForm"
              @submit.prevent="save"
        >
          <p
            class="notification is-success has-text-centered"
            v-if="profileSaved"
            data-test='profileSaveSuccess'
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
                <strong><i18n>Profile Picture</i18n>:</strong>
                <input
                  class="input"
                  :class="{'is-danger': $v.edited.picture.$error}"
                  type="text"
                  name="profilePicture"
                  v-model="edited.picture"
                  @input="$v.edited.picture.$touch()"
                  placeholder="http://"
                  data-test="profilePicture"
                >
                <i18n v-if="$v.edited.picture.$error" class="help is-danger">
                  The profile picture must be a valid url
                </i18n>
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Display Name</i18n>:</strong>
                <input class="input"
                  name="displayName"
                  type="text"
                  v-model="edited.displayName"
                  placeholder="Name"
                  data-test="displayName"
                >
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Email</i18n>:</strong>
                <input
                  class="input"
                  :class="{'is-danger': $v.edited.email.$error}"
                  name="profileEmail"
                  type="text"
                  v-model="edited.email"
                  @input="$v.edited.email.$touch()"
                  placeholder="Email"
                  data-test="profileEmail"
                >
                <i18n v-if="$v.edited.email.$error" class="help is-danger">Not an email</i18n>
              </div>
            </div>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Bio</i18n>:</strong>
                <textarea type="text"
                  class="textarea"
                  name="bio"
                  v-model="edited.bio"
                  placeholder="Bio"
                  data-test="bio"></textarea>
              </div>
            </div>
          </div>
          <div class="has-text-centered button-box">
            <button class="button is-success is-large"
              :disabled="$v.edited.$invalid"
              type="submit"
              data-test="submit"
            >
              <i18n>Save Profile</i18n>
            </button>
          </div>
        </form>
        <br>
        <form ref="GroupProfileForm"
              name="GroupProfileForm"
              @submit.prevent="saveGroupProfile"
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
              <i18n>Group Profile Attributes</i18n>
            </p>
            <div class="panel-block">
              <div class="media-content">
                <strong><i18n>Select Group</i18n>:</strong>
                <span class="select">
                  <select v-model="currentGroupContractId" v-on:change="changeGroup">
                    <option v-for="group in $store.getters.groupsByName" v-bind:value="group.contractID">{{group.groupName}}</option>
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
                    <input
                      class="input"
                      :class="{'is-danger': $v.editedGroupProfile.contributionAmount.$error}"
                      type="text"
                      name="contributionAmount"
                      placeholder="Contribution Amount"
                      v-model="editedGroupProfile.contributionAmount"
                      @input="$v.editedGroupProfile.contributionAmount.$touch()"
                    >
                  </p>
                </div>
                <i18n v-if="$v.editedGroupProfile.contributionAmount.$error" data-control="incomeProvided" class="help is-danger">
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
                    <input
                      class="input"
                      :class="{'is-danger': $v.editedGroupProfile.receivingLimit.$error}"
                      type="text"
                      name="receivingLimit"
                      placeholder="Receiving Limit"
                      v-model="editedGroupProfile.receivingLimit"
                      @input="$v.editedGroupProfile.receivingLimit.$touch()"
                    >
                  </p>
                </div>
                <i18n v-if="$v.editedGroupProfile.receivingLimit.$error" data-control="incomeProvided" class="help is-danger">
                  The Receiving Limit must be a numeric currency amount and may contain 2 decimal points.
                </i18n>
              </div>
            </div>
          </div>
          <div class="has-text-centered button-box">
            <button class="button is-success is-large" :disabled="$v.editedGroupProfile.$invalid" v-if="currentGroupContractId"><i18n>Save Group Profile</i18n></button>
          </div>
        </form>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>
<script>
import sbp from '../../../shared/sbp.js'
import {cloneDeep} from '../utils/giLodash'
import { validationMixin } from 'vuelidate'
import { url, email } from 'vuelidate/lib/validators'
import { decimals } from './utils/validators.js'
import L from './utils/translations.js'

export default {
  name: 'UserProfile',
  mixins: [ validationMixin ],
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
      // TODO: populate this based on profile values in current group's profile vuex state
      editedGroupProfile: {
        paymentMethod: null,
        contributionAmount: null,
        contributionCurrency: null,
        receivingLimit: null,
        receivingLimitCurrency: null
      },
      currentGroupContractId: this.$store.state.currentGroupId,
      errorMsg: null,
      groupErrorMsg: null,
      groupProfileSaved: false,
      profileSaved: false
    }
  },
  validations: {
    edited: {
      picture: { url },
      email: { email }
    },
    editedGroupProfile: {
      contributionAmount: {
        decimals: decimals(2)
      },
      receivingLimit: {
        decimals: decimals(2)
      }
    }
  },
  methods: {
    async save () {
      try {
        this.profileSaved = false
        var attrs = {}
        for (let key of Object.keys(this.edited)) {
          if (this.edited[key] && this.edited[key] !== this.attributes[key]) {
            attrs[key] = this.edited[key]
          }
        }
        let attributes = await sbp('gi/contract/create-action', 'IdentitySetAttributes',
          attrs,
          this.$store.state.loggedIn.identityContractId
        )
        await sbp('backend/publishLogEntry', attributes)
        this.profileSaved = true
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Save Profile')
      }
    },
    changeGroup () {
      this.editedGroupProfile = cloneDeep(
        this.$store
          .state[this.currentGroupContractId]
          .profiles[this.$store.state.loggedIn.name] || {}
      )
    },
    async saveGroupProfile () {
      try {
        this.groupProfileSaved = false
        let updatedProfile = await sbp('gi/contract/create-action', 'GroupSetGroupProfile',
          {
            username: this.$store.state.loggedIn.name,
            profile: this.editedGroupProfile
          },
          this.currentGroupContractId
        )
        await sbp('backend/publishLogEntry', updatedProfile)
        this.groupProfileSaved = true
      } catch (ex) {
        console.log(ex)
        this.groupErrorMsg = L('Failed to Save Group Profile')
      }
    }
  }
}
</script>
