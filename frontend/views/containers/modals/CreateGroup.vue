<template lang='pug'>
modal-base-template
  .steps(v-if='currentStep + 1 < config.steps.length')
    button.step(
      v-for='(step, index) in config.steps'
      :key='index'
      :class='[currentStep === index ? "active" : "", currentStep < index ? "next" : ""]'
      @click='redirect(step)'
      v-if='step != "GroupWelcome"'
    ) {{ index + 1 }}

  .wrapper.mobile-steps.subtitle(v-if='currentStep + 1 < config.steps.length')
    i18n(:args='{ current: currentStep + 1, max: config.steps.length - 1}') Step {current} of {max}

  transition(name='fade' mode='out-in')
    component(
      :is='content'
      :group='form'
      :v='$v.form'
      @next='next'
      @focusref='focusRef'
      @input='payload => updateGroupData(payload)'
    )
      .buttons(v-if='currentStep + 1 < config.steps.length')
        button.is-outlined(
          @click='prev'
          data-test='prevBtn'
        ) {{ currentStep === 0 ? L('Cancel') : L('Back') }}

        button.is-primary(
          v-if='currentStep + 2 < config.steps.length'
          ref='next'
          @click='next'
          :disabled='$v.steps[content] && $v.steps[content].$invalid'
          data-test='nextBtn'
        )
          | {{ L('Next') }}
          i.icon-arrow-right

        button.is-success(
          v-else=''
          ref='finish'
          @click='submit'
          :disabled='$v.form.$invalid'
          data-test='finishBtn'
        ) {{ L('Create Group') }}

  message(
    v-if='ephemeral.errorMsg'
    severity='danger'
  ) {{ ephemeral.errorMsg }}
</template>

<script>
import ModalBaseTemplate from '@components/Modal/ModalBaseTemplate.vue'
import sbp from '~/shared/sbp.js'
import { RULE_THRESHOLD } from '@model/contracts/voting/rules.js'
import { INVITE_INITIAL_CREATOR, createInvite } from '@model/contracts/group.js'
import proposals, { PROPOSAL_INVITE_MEMBER, PROPOSAL_REMOVE_MEMBER, PROPOSAL_GROUP_SETTING_CHANGE, PROPOSAL_PROPOSAL_SETTING_CHANGE, PROPOSAL_GENERIC } from '@model/contracts/voting/proposals.js'
import imageUpload from '@utils/imageUpload.js'
import L from '@view-utils/translations.js'
import { decimals } from '@view-utils/validators.js'
import StepAssistant from '@view-utils/stepAssistant.js'
import Message from '@components/Message.vue'
import { merge } from '@utils/giLodash.js'
import { validationMixin } from 'vuelidate'
import GroupWelcome from '@components/GroupWelcome.vue'
import {
  GroupName,
  GroupPurpose,
  GroupMincome,
  GroupRules,
  GroupPrivacy
} from '@components/CreateGroupSteps/index.js'

// we use require instead of import with this file to make rollup happy
// or not... using require only makes rollup happy during compilation
// but then the browser complains about "require is not defined"
import { required, between } from 'vuelidate/lib/validators'

export default {
  name: 'CreateGroupModal',
  mixins: [
    StepAssistant,
    validationMixin
  ],
  components: {
    ModalBaseTemplate,
    Message,
    GroupName,
    GroupPurpose,
    GroupMincome,
    GroupRules,
    GroupPrivacy,
    GroupWelcome
  },
  methods: {
    focusRef (ref) {
      this.$refs[ref].focus()
    },
    updateGroupData (payload) {
      this.ephemeral.errorMsg = null
      Object.assign(this.form, payload.data)
    },
    async submit () {
      if (this.$v.form.$invalid) {
        // TODO: more descriptive error message, highlight erroneous step
        this.ephemeral.errorMsg = L('We still need some info from you, please go back and fill missing fields')
        return
      }

      if (this.ephemeral.groupPictureFile) {
        try {
          this.form.groupPicture = await imageUpload(this.ephemeral.groupPictureFile)
        } catch (error) {
          console.error(error)
          this.ephemeral.errorMsg = L('Failed to upload Group Picture')
          return false
        }
      }

      // create the GroupContract
      try {
        this.ephemeral.errorMsg = null
        const initialInvite = createInvite({ quantity: 60, creator: INVITE_INITIAL_CREATOR })
        const entry = sbp('gi.contracts/group/create', {
          invites: {
            [initialInvite.inviteSecret]: initialInvite
          },
          settings: {
            // authorizations: [contracts.CanModifyAuths.dummyAuth()], // TODO: this
            groupName: this.form.groupName,
            groupPicture: this.form.groupPicture || '/assets/images/default-avatar.png',
            sharedValues: this.form.sharedValues,
            mincomeAmount: +this.form.mincomeAmount, // ensure this is a number
            mincomeCurrency: this.form.mincomeCurrency,
            proposals: {
              // TODO: make the UI support changing the rule type, so that we have
              //       a component for RULE_DISAGREEMENT as well
              [PROPOSAL_GROUP_SETTING_CHANGE]: merge({},
                proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults,
                { ruleSettings: { [RULE_THRESHOLD]: { threshold: this.form.changeThreshold } } }
              ),
              [PROPOSAL_INVITE_MEMBER]: merge({},
                proposals[PROPOSAL_INVITE_MEMBER].defaults,
                { ruleSettings: { [RULE_THRESHOLD]: { threshold: this.form.memberApprovalThreshold } } }
              ),
              [PROPOSAL_REMOVE_MEMBER]: merge({},
                proposals[PROPOSAL_REMOVE_MEMBER].defaults,
                { ruleSettings: { [RULE_THRESHOLD]: { threshold: this.form.memberRemovalThreshold } } }
              ),
              [PROPOSAL_PROPOSAL_SETTING_CHANGE]: proposals[PROPOSAL_PROPOSAL_SETTING_CHANGE].defaults,
              [PROPOSAL_GENERIC]: proposals[PROPOSAL_GENERIC].defaults
            }
          }
        })
        const hash = entry.hash()
        sbp('okTurtles.events/once', hash, (contractID, entry) => {
          this.$store.commit('setCurrentGroupId', hash)
          this.next()
        })
        await sbp('backend/publishLogEntry', entry)
        // add to vuex and monitor this contract for updates
        await sbp('state/enqueueContractSync', hash)
      } catch (error) {
        console.error(error)
        this.ephemeral.errorMsg = L('Failed to Create Group')
      }
    }
  },
  data () {
    return {
      form: {
        groupName: '',
        groupPicture: '',
        sharedValues: null,
        changeThreshold: proposals[PROPOSAL_GROUP_SETTING_CHANGE].defaults.ruleSettings[RULE_THRESHOLD].threshold,
        memberApprovalThreshold: proposals[PROPOSAL_INVITE_MEMBER].defaults.ruleSettings[RULE_THRESHOLD].threshold,
        memberRemovalThreshold: proposals[PROPOSAL_REMOVE_MEMBER].defaults.ruleSettings[RULE_THRESHOLD].threshold,
        mincomeAmount: null,
        mincomeCurrency: 'USD' // TODO: grab this as a constant from currencies.js
      },
      ephemeral: {
        errorMsg: null,
        // this determines whether or not to render proxy components for tests
        dev: process.env.NODE_ENV === 'development'
      },
      config: {
        steps: [
          'GroupName',
          'GroupPurpose',
          'GroupMincome',
          'GroupRules',
          'GroupWelcome'
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
      mincomeAmount: {
        required,
        minValue: (val) => val > 0,
        decimals: decimals(2)
      },
      mincomeCurrency: {
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
        'form.mincomeAmount',
        'form.mincomeCurrency'
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

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.modal {
  flex-direction: column;
  justify-content: top;
  align-items: center;
  background-color: $general_2;
}

.steps {
  width: calc(100% - 2rem);
  max-width: 34rem;
  margin-top: 3.5rem;
}

.wrapper {
  width: calc(100% - 2rem);
  max-width: 33rem;
}
</style>
