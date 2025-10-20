<template lang='pug'>
form(@submit.prevent='')
  label.c-poll-label
    i18n poll
    i18n.c-anonymous-postfix(v-if='isAnonymousPoll') (Votes Hidden)
  h3.is-title-4.c-poll-title {{ pollData.question }}

  i18n.pill.is-primary.c-poll-expiry-badge(:args='{ expiry: pollExpiryDate }') Expires on: {expiry}
  fieldset.is-column
    label.c-poll-option(
      v-for='option in pollData.options'
      :key='option.id'
      :class='allowMultipleChoices ? "checkbox" : "radio"'
    )
      input.input(v-if='allowMultipleChoices' type='checkbox' :value='option.id' v-model='form.selectedOptions')
      input.input(v-else type='radio' :name='messageId' :value='option.id' v-model='form.selectedOptions')
      span.c-poll-option-value {{ option.value }}

  banner-scoped(ref='errBanner')

  .buttons.c-buttons-container
    template
      button-submit.is-small(v-if='isChangeMode' data-test='submit' type='button' @click='changeVotes' :disabled='!enableSubmitBtn')
        i18n Change vote

      button-submit.is-small(v-else type='button' data-test='submit' @click='submitVotes' :disabled='!enableSubmitBtn')
        i18n Submit

    i18n.is-small.is-outlined(v-if='isChangeMode' tag='button' type='button' @click='onCancelClick') Cancel
</template>

<script>
import sbp from '@sbp/sbp'
import { cloneDeep } from 'turtledash'
import { POLL_TYPES } from '@model/contracts/shared/constants.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import PollMixin from '@containers/chatroom/PollMixin.js'

export default ({
  name: 'PollToVote',
  mixins: [PollMixin],
  components: {
    BannerScoped,
    ButtonSubmit
  },
  props: {
    pollData: Object,
    messageId: String,
    messageHash: String,
    isChangeMode: Boolean
  },
  data () {
    const initVal = () => this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES ? [] : ''

    return {
      form: {
        selectedOptions: initVal()
      },
      selectedOptionsBeforeUpdate: initVal()
    }
  },
  computed: {
    enableSubmitBtn () {
      if (this.isChangeMode) {
        return this.formBeenUpdated()
      } else {
        return this.allowMultipleChoices
          ? this.form.selectedOptions.length > 0
          : Boolean(this.form.selectedOptions)
      }
    },
    selectedVotesAsString () {
      if (this.isAnonymousPoll) { return '' }

      return this.allowMultipleChoices
        ? this.form.selectedOptions.map(id => this.getOptValue(id)).join(', ')
        : this.getOptValue(this.form.selectedOptions)
    }
  },
  methods: {
    async submitVotes () {
      try {
        await sbp('gi.actions/chatroom/voteOnPoll', {
          contractID: this.currentChatRoomId,
          data: {
            hash: this.messageHash,
            votes: this.allowMultipleChoices ? this.form.selectedOptions : [this.form.selectedOptions],
            votesAsString: this.isAnonymousPoll ? '' : `"${this.selectedVotesAsString}"`
          }
        })
      } catch (e) {
        console.error('"voteOnPoll" action failed: ', e)
        this.$refs.errBanner.danger(e.message)
      }
    },
    async changeVotes () {
      try {
        await sbp('gi.actions/chatroom/changeVoteOnPoll', {
          contractID: this.currentChatRoomId,
          data: {
            hash: this.messageHash,
            votes: this.allowMultipleChoices ? this.form.selectedOptions : [this.form.selectedOptions],
            votesAsString: this.isAnonymousPoll ? '' : `"${this.selectedVotesAsString}"`
          }
        })

        this.onCancelClick()
      } catch (e) {
        console.error('"changeVoteOnPoll" action failed: ', e)
        this.$refs.errBanner.danger(e.message)
      }
    },
    getOptValue (optId) {
      const foundOpt = this.pollData.options.find(x => x.id === optId)

      return foundOpt ? foundOpt.value : ''
    },
    formBeenUpdated () {
      if (this.allowMultipleChoices) {
        return this.selectedOptionsBeforeUpdate.length !== this.form.selectedOptions.length ||
          this.form.selectedOptions.some(optId => !this.selectedOptionsBeforeUpdate.includes(optId))
      } else return this.selectedOptionsBeforeUpdate !== this.form.selectedOptions
    },
    onCancelClick () {
      this.$emit('cancel-vote-change')
    }
  },
  mounted () {
    if (this.isChangeMode) {
      const extractedIds = this.pollData.options.filter(opt => opt.voted.includes(this.ourIdentityContractId))
        .map(opt => opt.id)

      if (extractedIds.length) {
        const initialized = this.allowMultipleChoices ? extractedIds : extractedIds[0]
        this.form.selectedOptions = cloneDeep(initialized)
        this.selectedOptionsBeforeUpdate = cloneDeep(initialized)
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-poll-label {
  display: block;
  text-transform: uppercase;
  color: $text_1;
  font-size: $size_5;
}

.c-anonymous-postfix {
  display: inline-block;
  margin-left: 0.25rem;
  font-weight: bold;
}

.c-poll-title {
  margin-bottom: 1.375rem;
}

.c-poll-option {
  &-value {
    white-space: normal;
  }

  &:not(:first-of-type) {
    margin-top: 1.75rem;
  }
}

.c-buttons-container {
  justify-content: flex-start;

  &:empty {
    margin-top: 0;
  }
}

.c-poll-expiry-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
}
</style>
