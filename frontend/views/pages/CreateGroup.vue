<template lang="pug">
//- TODO: move this into modal
main.main#create-group-page
  .steps
    router-link.step(
      v-for='(step, index) in config.steps'
      :key='index'
      :to='{name: step}'
      :class="[currentStep === index ? 'active' : '', currentStep < index ? 'next' : '']"
    ) {{ index + 1 }}

  transition(name='fade' mode='out-in')
    router-view(
      :group='form'
      :v='$v.form'
      @next='next'
      @focusref='focusRef'
      @input='payload => updateGroupData(payload)'
    )

  .buttons
    button.is-outlined(
      @click='prev'
      data-test='prevBtn'
    )
      i18n {{ currentStep === 0 ? 'Cancel' : 'Back' }}

    button.is-success(
      v-if='currentStep + 1 < config.steps.length'
      ref='next'
      @click='next'
      :disabled='$v.steps[$route.name] && $v.steps[$route.name].$invalid'
      data-test='nextBtn'
    )
      i18n Next
      i.icon-arrow-right

    button.is-success(
      v-else=''
      ref='finish'
      @click='submit'
      :disabled='$v.form.$invalid'
      data-test='finishBtn'
    )
      i18n Create Group

  message(
    v-if='ephemeral.errorMsg'
    severity='danger'
  ) {{ ephemeral.errorMsg }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import { blake32Hash } from '~/shared/functions.js'
import { handleFetchResult } from '~/frontend/controller/utils/misc.js'
import { TYPE_INVITE } from '@model/contracts/mailbox.js'
import L from '@view-utils/translations.js'
import { decimals } from '@view-utils/validators.js'
import StepAssistant from '@view-utils/stepAssistant.js'
import Message from '@components/Message.vue'
import { validationMixin } from 'vuelidate'

// we use require instead of import with this file to make rollup happy
// or not... using require only makes rollup happy during compilation
// but then the browser complains about "require is not defined"
import { required, between } from 'vuelidate/lib/validators'

export default {
  name: 'CreateGroupView',
  mixins: [
    StepAssistant,
    validationMixin
  ],
  components: {
    Message
  },
  methods: {
    focusRef (ref) {
      console.log(this.$refs[ref], this.$refs, ref)
      this.$refs[ref].focus()
    },
    updateGroupData (payload) {
      this.ephemeral.errorMsg = null
      Object.assign(this.form, payload.data)
    },
    submit: async function () {
      if (this.$v.form.$invalid) {
        // TODO: more descriptive error message, highlight erroneous step
        this.ephemeral.errorMsg = L('We still need some info from you, please go back and fill missing fields')
        return
      }

      // TODO: we need to show a progress bar for all of these steps

      // upload group profile picture if there is one and store it locally in our cache
      try {
        if (this.ephemeral.groupPictureFile) {
          const file = this.ephemeral.groupPictureFile
          console.debug('will upload a picture of type:', file.type)
          // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#Asynchronously_handling_the_file_upload_process
          const reply = await new Promise((resolve, reject) => {
            // we use FileReader to get raw bytes to generate correct hash
            const reader = new FileReader()
            // https://developer.mozilla.org/en-US/docs/Web/API/Blob
            reader.onloadend = async function () {
              const fd = new FormData()
              const hash = blake32Hash(new Uint8Array(reader.result))
              console.debug('groupPicture hash:', hash)
              fd.append('hash', hash)
              fd.append('data', file)
              fetch(`${process.env.API_URL}/file`, {
                method: 'POST',
                body: fd
              }).then(handleFetchResult('text')).then(resolve).catch(reject)
            }
            reader.readAsArrayBuffer(file)
          })
          this.form.groupPicture = reply + '?type=' + encodeURIComponent(file.type)
          console.debug('will use URL for image:', this.form.groupPicture)
        }
      } catch (error) {
        console.error(error)
        this.ephemeral.errorMsg = L('Failed to upload group picture')
        return
      }

      // create the GroupContract
      try {
        this.ephemeral.errorMsg = null
        const entry = sbp('gi.contracts/group/create', {
          // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
          groupName: this.form.groupName,
          groupPicture: this.form.groupPicture,
          sharedValues: this.form.sharedValues,
          changeThreshold: this.form.changeThreshold,
          memberApprovalThreshold: this.form.memberApprovalThreshold,
          memberRemovalThreshold: this.form.memberRemovalThreshold,
          incomeProvided: +this.form.incomeProvided, // ensure this is a number
          incomeCurrency: this.form.incomeCurrency
        })
        const hash = entry.hash()
        // TODO: convert this to SBL
        sbp('okTurtles.events/once', hash, (contractID, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          // Take them to the dashboard.
          // *** this.$router.push({ path: '/dashboard' })
          this.$router.push({ path: '/welcome' })
        })
        // TODO: convert this to SBL
        await sbp('backend/publishLogEntry', entry)
        // add to vuex and monitor this contract for updates
        await sbp('state/vuex/dispatch', 'syncContractWithServer', hash)
      } catch (error) {
        console.error(error)
        this.ephemeral.errorMsg = L('Failed to Create Group')
        return
      }

      // send out invitations to people's mailboxes (if there are any)
      try {
        this.ephemeral.errorMsg = null
        // TODO: as invitees are successfully invited display in a
        // seperate invitees grid and add them to some validation for duplicate invites
        for (const invitee of this.form.invitees) {
          // We need to post the invite to the users' mailbox contract
          const invite = await sbp('gi.contracts/mailbox/postMessage/create',
            {
              from: this.$store.getters.currentGroupState.groupName,
              headers: [this.$store.state.currentGroupId],
              messageType: TYPE_INVITE
            },
            invitee.state.attributes.mailbox
          )
          await sbp('backend/publishLogEntry', invite)

          // We need to make a record of the invitation in the group's contract
          const invited = await sbp('gi.contracts/group/invite/create',
            {
              username: invitee.state.attributes.name,
              inviteHash: invite.hash()
            },
            this.$store.state.currentGroupId
          )
          await sbp('backend/publishLogEntry', invited)
        }
      } catch (error) {
        console.error(error)
        // TODO: Create More descriptive errors
        this.ephemeral.errorMsg = L('Failed to Invite Users')
      }
    }
  },
  data () {
    return {
      form: {
        groupName: '',
        groupPicture: '',
        sharedValues: null,
        changeThreshold: 0.8,
        memberApprovalThreshold: 0.8,
        memberRemovalThreshold: 0.8,
        incomeProvided: null,
        incomeCurrency: 'USD', // TODO: grab this as a constant from currencies.js
        invitees: []
      },
      ephemeral: {
        errorMsg: null,
        // this determines whether or not to render proxy components for nightmare
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupName',
          'GroupPurpose',
          'GroupMincome',
          'GroupRules'
        ]
      }
    }
  },
  validations: {
    form: {
      groupName: { required },
      groupPicture: { },
      sharedValues: { required },
      changeThreshold: {
        required,
        between: between(0.01, 1)
      },
      memberApprovalThreshold: {
        required,
        between: between(0.01, 1)
      },
      memberRemovalThreshold: {
        required,
        between: between(0.01, 1)
      },
      incomeProvided: {
        required,
        decimals: decimals(2)
      },
      incomeCurrency: {
        required
      }
    },
    // validation groups by route name for steps
    steps: {
      GroupName: [
        'form.groupName',
        'form.groupPicture'
      ],
      GroupPurpose: ['form.sharedValues'],
      GroupMincome: [
        'form.incomeProvided',
        'form.incomeCurrency'
      ],
      GroupRules: [
        'form.changeThreshold',
        'form.memberApprovalThreshold',
        'form.memberRemovalThreshold'
      ]
    }
  }
}
</script>

<style scoped>
.main {
  /* TODO: Remove this later */
  max-width: 600px;
  padding: 2.5rem;
}
</style>
