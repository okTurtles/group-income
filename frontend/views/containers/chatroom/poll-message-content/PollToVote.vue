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
    i18n.is-small(tag='button' type='button' @click='submitVotes') submit
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { POLL_TYPES } from '@model/contracts/shared/constants.js'

export default ({
  name: 'PollToVote',
  props: {
    pollData: Object,
    messageId: String,
    messageHash: String
  },
  data () {
    return {
      form: {
        selectedOptions: this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES ? [] : ''
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId'
    ]),
    allowMultipleChoices () {
      return this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES
    },
    enableSubmitBtn () {
      return this.allowMultipleChoices ? this.form.selectedOptions.length > 0 : Boolean(this.form.selectedOptions)
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
