<template lang='pug'>
message-base(
  v-bind='$props'
  @delete-message='deleteMessage'
)
  template(#body='')
    i18n.c-poll-created-sentence(tag='p') Created a new poll:

  template(#full-width-body='')
    .c-poll-container
      form.c-poll-form(@submit.prevent='')
        i18n.c-poll-label(tag='label') poll
        h3.is-title-4.c-poll-title {{ pollData.question }}

        fieldset.is-column.c-poll-options-list
          label.c-poll-option(
            v-for='option in pollData.options'
            :key='option.id'
            :class='allowMultipleChoices ? "checkbox" : "radio"'
          )
            input.input(v-if='allowMultipleChoices' type='checkbox' :value='option.id' v-model='form.selectedOptions')
            input.input(v-else type='radio' :name='messageId' :value='option.id' v-model='form.selectedOptions')
            span.c-poll-option-value {{ option.value }}

        .buttons(v-if='enableSubmitBtn')
          i18n.is-small(tag='button' type='button' @click='submitSelections') submit
</template>

<script>
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS, POLL_TYPES } from '@model/contracts/shared/constants.js'

export default ({
  name: 'MessagePoll',
  components: {
    MessageBase
  },
  props: {
    pollData: Object, // { creator, status, question, options ... }
    messageId: String,
    who: String,
    type: String,
    avatar: String,
    datetime: {
      type: Date,
      required: true
    },
    variant: {
      type: String,
      validator (value) {
        return Object.values(MESSAGE_VARIANTS).indexOf(value) !== -1
      }
    },
    isCurrentUser: Boolean
  },
  data () {
    return {
      form: {
        selectedOptions: this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES ? [] : ''
      }
    }
  },
  computed: {
    allowMultipleChoices () {
      return this.pollData.pollType === POLL_TYPES.MULTIPLE_CHOICES
    },
    enableSubmitBtn () {
      return this.allowMultipleChoices ? this.form.selectedOptions.length > 0 : Boolean(this.form.selectedOptions)
    }
  },
  methods: {
    submitSelections () {
      alert('TODO: implement poll selection.')
    },
    deleteMessage () {
      this.$emit('delete-message')
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-poll-created-sentence {
  color: $text_1;
  font-style: italic;
  margin-bottom: 0.75rem;
}

.c-poll-container {
  @include tablet {
    padding-left: 3rem;
  }
}

.c-poll-form {
  width: 100%;
  border-radius: 10px;
  border: 1px solid $general_0;
  padding: 1rem;
}

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
