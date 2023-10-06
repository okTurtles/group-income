<template lang='pug'>
form(@submit.prevent='')
  i18n.c-poll-label(tag='label') poll
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
    template(v-if='enableSubmitBtn')
      button-submit.is-small(
        v-if='isChangeMode'
        type='button'
        @click='changeVotes'
      )
        i18n Change vote

      button-submit.is-small(
        v-else
        type='button'
        @click='submitVotes'
      )
        i18n Submit

    i18n.is-small.is-outlined(v-if='isChangeMode' tag='button' type='button' @click='onCancelClick') Cancel
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'
import { POLL_TYPES } from '@model/contracts/shared/constants.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import { humanDate } from '@model/contracts/shared/time.js'

export default ({
  name: 'PollToVote',
  inject: ['pollUtils'],
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
    ...mapGetters([
      'ourUsername',
      'currentChatRoomId'
    ]),
    allowMultipleChoices () {
      return this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES
    },
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
      return this.allowMultipleChoices
        ? this.form.selectedOptions.map(id => this.getOptValue(id)).join(', ')
        : this.getOptValue(this.form.selectedOptions)
    },
    pollExpiryDate () {
      return humanDate(new Date(this.pollData.expires_date_ms))
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
            votesAsString: `"${this.selectedVotesAsString}"`
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
            votesAsString: `"${this.selectedVotesAsString}"`
          }
        })

        this.pollUtils.switchOffChangeMode()
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
      this.pollUtils.switchOffChangeMode()
    }
  },
  mounted () {
    if (this.isChangeMode) {
      const extractedIds = this.pollData.options.filter(opt => opt.voted.includes(this.ourUsername))
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
