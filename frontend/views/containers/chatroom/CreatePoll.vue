<template lang="pug">
.c-create-poll(:class='{ "is-active": ephemeral.isActive }' @click='onBackDropClick')
  .c-create-poll-wrapper
    header.c-header
      i18n.is-title-2.c-popup-title(tag='h2') New poll
      modal-close.c-popup-close-btn(@close='close')

    section.c-body
      form.c-form
        .field
          input.input(
            name='question'
            ref='question'
            v-model.trim='form.question'
            placeholder='L("Ask a question!")'
            @input='debounceField("question")'
            @blur='updateField("question")'
          )

        .field
          i18n.label Add options

          .c-option-list
            fieldset.inputgroup.c-option-item(
              v-for='(option, index) in form.options'
              :key='option.id'
            )
              input.input(
                type='text'
                :aria-label='L("Option value")'
                :placeholder='optionPlaceholder(index + 1)'
              )
              button.is-icon-small.is-btn-shifted(
                type='button'
                :aria-label='L("Remove option")'
                @click='removeOption(option.id)'
              )
                i.icon-times

          button.link.has-icon(
            type='button'
            @click='addOption'
          )
            i.icon-plus
            i18n Add more

        .buttons.c-btns-container(:class='{ "is-vertical": ephemeral.isDesktopScreen }')
          i18n.is-outlined(
            :class='{ "is-small": ephemeral.isDesktopScreen }'
            tag='button'
          ) Cancel

          i18n(
            :class='{ "is-small": ephemeral.isDesktopScreen }'
            tag='button'
            type='submit'
          ) Create poll
</template>

<script>
import sbp from '@sbp/sbp'
import { Vue, L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import ModalClose from '@components/modal/ModalClose.vue'
import { OPEN_POLL, CLOSE_POLL } from '@utils/events.js'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'

const createRandomId = () => Math.random().toString(20).slice(2)

export default {
  name: 'CreatePoll',
  mixins: [
    validationMixin,
    validationsDebouncedMixins
  ],
  components: {
    ModalClose
  },
  data () {
    return {
      ephemeral: {
        isActive: false,
        isDesktopScreen: false
      },
      form: {
        question: '',
        options: [
          { id: createRandomId(), value: '' }
        ]
      }
    }
  },
  computed: {
    optionCount () {
      return this.form.options.length
    }
  },
  methods: {
    open () {
      this.ephemeral.isActive = true
    },
    close () {
      this.ephemeral.isActive = false
    },
    onBackDropClick (e) {
      const element = document.elementFromPoint(e.clientX, e.clientY).closest('.c-create-poll-wrapper')

      if (!element) {
        this.close()
      }
    },
    optionPlaceholder (index) {
      return `${L('Option')} ${index}`
    },
    addOption () {
      Vue.set(this.form.options, this.optionCount, {
        id: createRandomId(),
        value: ''
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
    }
  },
  created () {
    sbp('okTurtles.events/on', OPEN_POLL, this.open)
    sbp('okTurtles.events/on', CLOSE_POLL, this.close)

    this.matchMediaDesktop = window.matchMedia('screen and (min-width: 770px)')
    this.matchMediaDesktop.onchange = (e) => {
      this.ephemeral.isDesktopScreen = e.matches
    }
    this.ephemeral.isDesktopScreen = this.matchMediaDesktop.matches
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', OPEN_POLL, this.open)
    sbp('okTurtles.events/off', CLOSE_POLL, this.close)

    this.matchMediaDesktop.onchange = null
  },
  validations () {
    return {
      form: {
        question: {
          [L('The question is required.')]: required
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
  z-index: $zindex-modal;

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
  box-shadow: 0 0 20px rgba(219, 219, 219, 0.6);

  .is-dark-theme & {
    box-shadow: 0 0 20px rgba(46, 46, 46, 0.6);
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
  position: relative;
  height: 5.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.c-body {
  position: relative;
  overflow-y: auto;
  max-width: 27rem;
  padding: 1.5rem 1rem;
  margin: 0 auto;
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
</style>
