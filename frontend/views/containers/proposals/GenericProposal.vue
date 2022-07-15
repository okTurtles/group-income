<template lang="pug">
proposal-template(
  :title='L("Generic Proposal")'
  :maxSteps='0'
  :disabled='$v.form.$invalid'
  :currentStep.sync='ephemeral.currentStep'
  @submit='submit'
)
  banner-scoped(ref='formMsg')

  label.field(v-if='ephemeral.currentStep === 0' key='0')
    .label
      i18n Name your proposal
      tooltip.c-name-tooltip(
        direction='top'
        :isTextCenter='true'
        :text='L("Group members will be able to vote Yes/No on this proposal. Make sure it is clear and concise.")'
      )
        button.is-icon-smaller.c-name-tooltip-btn
          i.icon-info

    input.input(
      :class='{error: $v.form.proposalName.$error}'
      name='proposalname'
      v-model='form.proposalName'
      @input='debounceField("proposalName")'
      @blur='updateField("proposalName")'
      v-error:proposalName=''
      autofocus
    )
</template>

<script>
import { PROPOSAL_GENERIC } from '@model/contracts/voting/constants.js'
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import ProposalTemplate from './ProposalTemplate.vue'
import Tooltip from '@components/Tooltip.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import L from '@view-utils/translations.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'


export default ({
  name: 'GenericProposal',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    ProposalTemplate,
    Tooltip,
    BannerScoped
  },
  data () {
    return {
      form: {
        proposalName: null
      },
      ephemeral: {
        currentStep: 0
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    async submit ({ reason }) {
      const proposalSettings = this.groupSettings.proposals[PROPOSAL_GENERIC]
      
      try {
        await sbp('gi.actions/group/proposal', {
          contractID: this.currentGroupId,
          data: {
            proposalType: PROPOSAL_GENERIC,
            proposalData: {
              name: this.form.proposalName,
              reason
            },
            votingRule: proposalSettings.rule,
            expires_date_ms: Date.now() + proposalSettings.expires_ms
          }
        })
      } catch (e) {
        console.error(`Creating a generic proposal "${this.form.proposalName}"" failed!:`, e.message)
        this.$refs.formMsg.danger(e.message)

        return
      }

      this.ephemeral.currentStep += 1 // Show Success step!
    }
  },
  validations: {
    form: {
      proposalName: {
        [L('A proposal name is required.')]: required
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-name-tooltip {
  display: inline-block;
  margin-left: 0.5rem;

  &-btn {
    background-color: $primary_0;
    color: $background_0;

    &:hover,
    &:focus {
      background-color: $primary_0;
      color: $background_0;
    }
  }
}
</style>
