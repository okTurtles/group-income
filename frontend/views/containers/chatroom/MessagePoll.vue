<template lang='pug'>
message-base(v-bind='$props')
  template(#body='')
    .c-poll-container
      i18n.c-poll-created-sentence(tag='p') Created a new poll:

      form.c-poll-form(@submit.prevent='')
        i18n.c-poll-label(tag='label') poll
        h3.is-title-4.c-poll-title {{ pollData.question }}

        fieldset.is-column.c-poll-options-list
          label.checkbox.c-poll-option(v-for='option in pollData.options' :key='option.id')
            input.input(
              type='checkbox'
              :name='messageId'
              :value='option.value'
              v-model='form.selectedOptions'
            )
            span.c-poll-option-value {{ option.value }}

        .buttons(v-if='form.selectedOptions.length')
          i18n.is-small(tag='button' type='button' @click='submitSelections') submit
</template>

<script>
import MessageBase from './MessageBase.vue'
import { MESSAGE_VARIANTS } from '@model/contracts/shared/constants.js'

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
        selectedOptions: []
      }
    }
  },
  methods: {
    submitSelections () {
      alert('TODO: implement poll selection.')
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
  }

  &:not(:first-of-type) {
    margin-top: 1.75rem;
  }
}
</style>
