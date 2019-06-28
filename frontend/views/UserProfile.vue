<template lang="pug">
main
  .section
    form(
      ref='GroupProfileForm'
      name='GroupProfileForm'
      @submit.prevent='saveGroupProfile'
      data-test='GroupProfileForm'
    )
      p.notification.is-success.has-text-centered(
        v-if='groupProfileSaved'
        data-test='GroupProfileSaved'
      )
        i.notification-icon.icon-check
        i18n Group Profile saved successfully!

      p.notification.is-danger.has-text-centered(v-if='groupErrorMsg')
        i.notification-icon.icon-exclamation-triangle {{groupErrorMsg}}

      .panel
        p.panel-heading
          i18n Group Profile Attributes

        .panel-block
          .media-content
            strong
              i18n Select Group
              | :

            span.select
              select(
                v-model='currentGroupContractId'
                v-on:change='changeGroup'
                data-test='GroupProfileId'
              )
                option(
                  v-for='(group, index) in $store.getters.groupsByName'
                  v-bind:value='group.contractID'
                  :key='`group-${index}`'
                ) {{group.groupName}}

        .panel-block(v-if='currentGroupContractId')
          .media-content
            strong
              i18n PaymentType
              | :

            span.select(type='text')
              select(
                v-model='editedGroupProfile.paymentMethod'
                data-test='GroupProfilePaymentMethod'
              )
                option
                option Bitcoin
                option Amex
                option Visa
                option Paypal

        .panel-block(v-if='currentGroupContractId')
          .media-content
            strong
              i18n Contribution Amount
              | :

            .field.has-addons
              p.control
                // - TODO: Make this a real field
                span.select
                  select(
                    v-model='editedGroupProfile.contributionCurrency'
                    data-test='GroupProfileContributionCurrency'
                  )
                    option USD
                    option BTC
                    option EUR
              p.control
                input.input(
                  :class="{'error': $v.editedGroupProfile.contributionAmount.$error}"
                  type='text'
                  name='contributionAmount'
                  placeholder='Contribution Amount'
                  v-model='editedGroupProfile.contributionAmount'
                  @input='$v.editedGroupProfile.contributionAmount.$touch()'
                  data-test='GroupProfileContributionAmount'
                )

            i18n.help.is-danger(
              v-if='$v.editedGroupProfile.contributionAmount.$error'
              data-control='incomeProvided'
            )
              | The Contribution Amount must be a numeric currency amount and may contain 2 decimal points.

        .panel-block(v-if='currentGroupContractId')
          .media-content
            strong
              i18n Receiving Limit
              | :

            .field.has-addons
              p.control
                // - TODO: Make this a real field
                span.select
                  select(
                    v-model='editedGroupProfile.receivingLimitCurrency'
                    data-test='GroupProfileReceivingCurrency'
                  )
                    option USD
                    option BTC
                    option EUR
              p.control
                input.input(
                  :class="{'error': $v.editedGroupProfile.receivingLimit.$error}"
                  type='text'
                  name='receivingLimit'
                  placeholder='Receiving Limit'
                  v-model='editedGroupProfile.receivingLimit'
                  @input='$v.editedGroupProfile.receivingLimit.$touch()'
                  data-test='GroupProfileReceivingAmount'
                )

            i18n.help.is-danger(v-if='$v.editedGroupProfile.receivingLimit.$error' data-control='incomeProvided')
              | The Receiving Limit must be a numeric currency amount and may contain 2 decimal points.

      .has-text-centered.button-box
        button.is-success(
          v-if='currentGroupContractId'
          :disabled='$v.editedGroupProfile.$invalid'
          data-test='GroupProfileSubmitBtn'
        )
          i18n Save Group Profile

</template>
<script>
import { validationMixin } from 'vuelidate'
import { email, helpers } from 'vuelidate/lib/validators'
import { cloneDeep } from '@utils/giLodash.js'
import { decimals } from '@view-utils/validators.js'
import L from '@view-utils/translations.js'
import sbp from '~/shared/sbp.js'

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
