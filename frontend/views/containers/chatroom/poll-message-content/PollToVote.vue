<template lang='pug'>
form(@submit.prevent='')
  i18n.c-poll-label(tag='label') poll
  h3.is-title-4.c-poll-title {{ pollData.question }}

  fieldset.is-column
    label.c-poll-option(
      v-for='option in pollData.options'
      :key='option.id'
      :class='allowMultipleChoices ? "checkbox" : "radio"'
    )
      input.input(v-if='allowMultipleChoices' type='checkbox' :value='option.id' v-model='form.selectedOptions')
      input.input(v-else type='radio' :name='messageId' :value='option.id' v-model='form.selectedOptions')
      span.c-poll-option-value {{ option.value }}

  .buttons(v-if='enableSubmitBtn')
    i18n.is-small.is-outlined(v-if='isChangeMode' tag='button' type='button' @click='changeVotes') change vote
    i18n.is-small(v-else tag='button' type='button' @click='submitVotes') submit
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { cloneDeep } from '@model/contracts/shared/giLodash.js'
import { POLL_TYPES } from '@model/contracts/shared/constants.js'

export default ({
  name: 'PollToVote',
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
    }
  },
  methods: {
    submitVotes () {
      sbp('gi.actions/chatroom/voteOnPoll', {
        contractID: this.currentChatRoomId,
        data: {
          hash: this.messageHash,
          votes: this.allowMultipleChoices ? this.form.selectedOptions : [this.form.selectedOptions]
        }
      })
    },
    changeVotes () {
      alert('TODO:: implement changing votes on polls')
    },
    formBeenUpdated () {
      if (this.allowMultipleChoices) {
        return this.selectedOptionsBeforeUpdate.length !== this.form.selectedOptions.length ||
          this.form.selectedOptions.some(optId => !this.selectedOptionsBeforeUpdate.includes(optId))
      } else return this.selectedOptionsBeforeUpdate !== this.form.selectedOptions
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
    text-transform: capitalize;
    white-space: normal;
  }

  &:not(:first-of-type) {
    margin-top: 1.75rem;
  }
}
</style>
