<template>
  <main>
    <div class="section">
      <form ref="GroupProfileForm"
            name="GroupProfileForm"
            @submit.prevent="saveGroupProfile"
      >
        <p
          class="notification is-success has-text-centered"
          v-if="groupProfileSaved"
          data-test="GroupProfileSaved"
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
                <select v-model="currentGroupContractId" v-on:change="changeGroup" data-test="GroupProfileId">
                  <option v-for="(group, index) in $store.getters.groupsByName" v-bind:value="group.contractID" :key="`group-${index}`">
                    {{group.groupName}}
                    </option>
                </select>
              </span>
            </div>
          </div>
          <div class="panel-block" v-if="currentGroupContractId">
            <div class="media-content">
              <strong><i18n>PaymentType</i18n>: </strong>
              <span class="select" type="text">
                <select v-model="editedGroupProfile.paymentMethod" data-test="GroupProfilePaymentMethod">
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
                    <select v-model="editedGroupProfile.contributionCurrency" data-test="GroupProfileContributionCurrency">
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
                    data-test="GroupProfileContributionAmount"
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
                    <select v-model="editedGroupProfile.receivingLimitCurrency" data-test="GroupProfileReceivingCurrency">
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
                    data-test="GroupProfileReceivingAmount"
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
          <button
            class="button is-success is-large"
            :disabled="$v.editedGroupProfile.$invalid"
            v-if="currentGroupContractId"
            data-test="GroupProfileSubmitBtn">
              <i18n>Save Group Profile</i18n>
          </button>
        </div>
      </form>
    </div>
  </main>
</template>
<script>
import sbp from '../../shared/sbp.js'
import { cloneDeep } from '../utils/giLodash.js'
import { validationMixin } from 'vuelidate'
import { decimals } from './utils/validators.js'
import { email, helpers } from 'vuelidate/lib/validators'
import L from './utils/translations.js'

const url = helpers.regex('url', /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i)

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
