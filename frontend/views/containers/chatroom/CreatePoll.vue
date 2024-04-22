<template lang="pug">
.c-create-poll(:class='{ "is-active": ephemeral.isActive }'
  @click='onBackDropClick'
  @keyup.esc='close'
)
  .c-create-poll-wrapper(:style='this.ephemeral.isDesktopScreen ? this.ephemeral.wrapperPosition : {}')
    header.c-header
      i18n.is-title-2.c-popup-title(tag='h2') New poll
      modal-close.c-popup-close-btn(v-if='!ephemeral.isDesktopScreen' @close='close')

    section.c-body
      form.c-form(@submit.prevent='' :disabled='form.disabled')
        .field
          input.input.c-input(
            name='question'
            ref='question'
            :placeholder='L("Ask a question!")'
            @input='e => debounceField("question", e.target.value)'
            @blur='e => updateField("question", e.target.value)'
            :class='{ error: $v.form.question.$error }'
            v-model='form.question'
            v-error:question=''
          )

        .field.c-add-options
          i18n.label Add options

          .c-option-list(ref='optList')
            fieldset.inputgroup.c-option-item(
              v-for='(option, index) in form.options'
              :key='option.id'
            )
              input.input.c-input(
                type='text'
                :aria-label='L("Option value")'
                :ref='"input" + option.id'
                :placeholder='optionPlaceholder(index + 1)'
                v-model.trim='option.value'
              )
              button.is-icon-small.is-btn-shifted(
                type='button'
                :aria-label='L("Remove option")'
                @click='removeOption(option.id)'
              )
                i.icon-times

          button.link.has-icon(
            v-if='enableMoreButton'
            type='button'
            @click='addOption'
          )
            i.icon-plus
            i18n Add more

        label.field
          i18n.label Expires after (days)
          .selectbox
            select.select.c-duration-select(
              name='pollDuration'
              required=''
              v-model='form.duration'
            )
              option(
                v-for='n in 30'
                :key='"duration-" + n'
                :value='n'
              ) {{ n }}

        label.checkbox.c-checkbox
          input.input(type='checkbox' v-model='form.allowMultipleChoice' @click.stop='')
          i18n Allow multiple choice

        label.checkbox.c-checkbox.c-hide-voters-check
          input.input(type='checkbox' v-model='form.hideVoters' @click.stop='')
          i18n hide Voters

        .c-hide-voters-disclaimer
          i.icon-exclamation-triangle
          i18n Note: it is possible for a group member to "hack" the app to figure out who voted on what.

        .buttons.c-btns-container(:class='{ "is-vertical": ephemeral.isDesktopScreen }')
          i18n.is-outlined(
            :class='{ "is-small": ephemeral.isDesktopScreen }'
            tag='button'
            type='button'
            @click='close'
          ) Cancel

          i18n(
            :disabled='disableSubmit'
            :class='{ "is-small": ephemeral.isDesktopScreen }'
            tag='button'
            type='button'
            @click='submit'
          ) Create poll
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { Vue, L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import ModalClose from '@components/modal/ModalClose.vue'
import { MESSAGE_TYPES, POLL_TYPES, POLL_MAX_OPTIONS } from '@model/contracts/shared/constants.js'
import { DAYS_MILLIS } from '@model/contracts/shared/time.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import trapFocus from '@utils/trapFocus.js'

const createRandomId = () => {
  const randomStr = () => Math.random().toString(20).slice(2)
  return `${randomStr()}-${randomStr()}`
}

export default {
  name: 'CreatePoll',
  mixins: [
    validationMixin,
    validationsDebouncedMixins,
    trapFocus
  ],
  components: {
    ModalClose
  },
  data () {
    return {
      ephemeral: {
        isActive: false,
        isDesktopScreen: false,
        wrapperPosition: {
          bottom: 0,
          left: 0
        }
      },
      form: {
        disabled: false,
        question: '',
        allowMultipleChoice: false,
        hideVoters: false,
        duration: 7,
        options: [
          { id: createRandomId(), value: '' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentChatRoomId'
    ]),
    optionCount () {
      return this.form.options.length
    },
    enableMoreButton () {
      return this.optionCount < POLL_MAX_OPTIONS
    },
    disableSubmit () {
      return this.$v.invalid ||
        this.form.options.length < 2 ||
        this.form.options.some(opt => !opt.value) ||
        this.form.disabled
    }
  },
  methods: {
    open (position) {
      if (this.ephemeral.isActive) { return }

      if (position) {
        this.ephemeral.wrapperPosition = { ...position }
        this.$nextTick(() => { this.ephemeral.isActive = true })
      } else {
        this.ephemeral.isActive = true
      }
    },
    close () {
      if (this.ephemeral.isActive) {
        this.ephemeral.isActive = false
      }
    },
    onBackDropClick (e) {
      if (e.target.matches('.c-create-poll')) {
        this.close()
      }
    },
    optionPlaceholder (index) {
      return L('Option {index}', { index })
    },
    addOption (e) {
      e.stopPropagation()

      const newOptionId = createRandomId()
      Vue.set(this.form.options, this.optionCount, {
        id: newOptionId,
        value: ''
      })

      this.$nextTick(() => {
        const newInputEl = this.$refs.optList?.querySelector('.c-option-item:last-of-type > .input')

        newInputEl && newInputEl.focus()
      })
    },
    removeOption (id) {
      if (this.optionCount > 1) {
        const index = this.form.options.findIndex(opt => opt.id === id)
        this.form.options.splice(index, 1)
      } else if (this.optionCount === 1) {
        Vue.set(this.form.options, 0, {
          id: createRandomId(),
          value: ''
        })
      }
    },
    submit () {
      this.form.disabled = true
      const contractID = this.currentChatRoomId
      sbp('gi.actions/chatroom/addMessage', {
        contractID,
        data: {
          type: MESSAGE_TYPES.POLL,
          pollData: {
            question: this.form.question,
            options: this.form.options,
            expires_date_ms: Date.now() + this.form.duration * DAYS_MILLIS,
            hideVoters: this.form.hideVoters,
            pollType: this.form.allowMultipleChoice
              ? POLL_TYPES.MULTIPLE_CHOICES
              : POLL_TYPES.SINGLE_CHOICE
          }
        }
      }).catch((e) => {
        console.log(`Error adding message to create poll for ${contractID}`, e)
      }).finally(() => {
        this.form = {
          question: '',
          allowMultipleChoice: false,
          hideVoters: false,
          options: [
            { id: createRandomId(), value: '' }
          ],
          disabled: false
        }
        this.$v.form.$reset()
        this.close()
      })
    }
  },
  created () {
    this.matchMediaDesktop = window.matchMedia('screen and (min-width: 770px)')
    this.matchMediaDesktop.onchange = (e) => {
      this.ephemeral.isDesktopScreen = e.matches
    }
    this.ephemeral.isDesktopScreen = this.matchMediaDesktop.matches

    window.addEventListener('resize', this.close)
    document.addEventListener('keydown', this.trapFocus)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.close)
    document.removeEventListener('keydown', this.trapFocus)

    this.matchMediaDesktop.onchange = null
  },
  validations () {
    return {
      form: {
        question: {
          [L('A question is required.')]: required
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-create-poll {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  pointer-events: none;
  overflow: hidden;
  // NOTE: z-index should be bigger than the one of sidebar
  //       because CreatePoll modal is rendered before the sidebar
  // REF:  https://github.com/okTurtles/group-income/issues/1843
  z-index: $zindex-modal + 1;

  &.is-active {
    pointer-events: initial;
    height: 100%;
  }
}

.c-create-poll-wrapper {
  position: absolute;
  pointer-events: inherit;
  background-color: $background_0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "poll-header" "poll-body";

  @include tablet {
    height: auto;
    max-width: 24.375rem;
    max-height: 70vh;
    border-radius: 0.75rem;
    box-shadow: 0 0 20px rgba(219, 219, 219, 0.6);
    left: unset;

    .is-dark-theme & {
      box-shadow: 0 0 20px rgba(38, 38, 38, 0.625);
    }
  }
}

.c-popup-title {
  font-size: $size_2;
  text-align: center;

  @include tablet {
    font-size: $size_3;
    text-align: left;
  }
}

.c-popup-close-btn {
  position: absolute !important;
}

.c-header {
  grid-area: poll-header;
  position: relative;
  height: 5.75rem;
  display: flex;
  align-items: center;
  justify-content: center;

  @include tablet {
    height: 3.25rem;
  }
}

.c-input {
  padding-right: 0.625rem;
}

.c-body {
  grid-area: poll-body;
  position: relative;
  max-width: 27rem;
  width: 100%;
  padding: 1.5rem 1rem;
  margin: 0 auto;
  overflow-y: auto;

  @include tablet {
    padding-top: 0;
    max-width: unset;
    width: 100%;
  }
}

.c-option-list {
  margin-bottom: 1.5rem;
}

.c-option-item {
  position: relative;

  &:not(:last-of-type) {
    margin-bottom: 0.5rem;
  }
}

.c-btns-container.is-vertical {
  flex-direction: column;
  gap: 1rem;

  > button {
    align-self: stretch;
    margin-right: 0;
  }
}

.c-checkbox {
  display: block;

  &.c-hide-voters-check {
    margin-top: 0.75rem;
  }
}

.c-hide-voters-disclaimer {
  display: block;
  color: $text_1;
  font-size: $size_5;
  margin-top: 0.2rem;

  i {
    font-size: 0.8em;
    margin-right: 4px;
  }
}
</style>
