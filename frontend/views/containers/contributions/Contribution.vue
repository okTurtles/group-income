<template lang='pug'>
transition(name='replace-list')
  li.c-contribution-edit(v-if='isEditing || isAdding' data-test='editing' key='editing')
    form.c-contribution(
      @submit.prevent=''
      novalidate='true'
    )
      .c-label-container
        span.c-char-len {{ contributionCharLen }}
      input.input(
        type='text'
        :placeholder='randomPlaceholder'
        :aria-label='L("Your contribution")'
        :maxlength='contributionMaxChar'
        v-error:contribution=''
        v-focus=''
        v-model='$v.form.contribution.$model'
        data-test='inputNonMonetaryContribution'
        @keyup='verifyValue'
        @keydown.esc='cancel'
        @keydown.enter.prevent='handleEnter'
      )

      .c-helper(v-if='receiverHasOnlyOneItem')
        i.icon-info-circle
        i18n At least one non-monetary contribution is required.

      .buttons
        button-submit.is-small.is-danger.is-outlined(
          v-if='showRemoveBtn'
          @click='handleDelete'
          data-test='buttonRemoveNonMonetaryContribution'
        ) {{ L('Remove') }}
        .c-buttons-right
          i18n.button.is-small.is-outlined(
            tag='button'
            @click='cancel'
            data-test='buttonCancelNonMonetaryContribution'
          ) Cancel
          button-submit.is-small(
            v-if='isAdding && isFilled'
            @click='handleSubmit'
            data-test='buttonAddNonMonetaryContribution'
          ) {{ L('Add') }}
          button-submit.is-small(
            v-if='isEditing && isFilled'
            @click='handleSubmit'
            data-test='buttonSaveNonMonetaryContribution'
          ) {{ L('Save') }}

  li(v-else-if='isEditable' :class='itemClasses' data-test='editable' key='editable')
    slot

    button.button.is-small.is-outlined.c-inline-button(
      :aria-label='editAriaLabel'
      @click='handleEditClick'
      data-test='buttonEditNonMonetaryContribution'
    )
      i.icon-pencil-alt.is-prefix
      | {{ L('Edit') }}

  li.c-spacer-above(v-else-if='isUnfilled' data-test='unfilled' key='unfilled')
    button.button.is-small(
      data-test='addNonMonetaryContribution'
      :class='itemClasses'
      @click='isAdding = true'
    )
      slot

  li(v-else='' :class='itemClasses' data-test='basic' key='basic')
    slot
</template>

<script>
import { L } from '@common/common.js'
import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import { GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR } from '@model/contracts/shared/constants.js'

export default ({
  name: 'Contribution',
  mixins: [validationMixin],
  components: {
    ButtonSubmit
  },
  props: {
    variant: {
      type: String,
      validator (value) {
        return [
          'default', // Display the contribution
          'unfilled', // Add a new contribution
          'editable' // Edit a contribution
        ].indexOf(value) > -1
      },
      default: 'default'
    },
    initialValue: {
      type: String
    },
    needsIncome: Boolean,
    contributionsList: Array
  },
  data () {
    return {
      isAdding: false,
      isEditing: false,
      isFilled: null, // decide what input buttons to show
      placeholders: [L('Portuguese classes'), L('Programming'), L('Cooking'), L('Parties'), L('Free cinema tickets')],
      form: {
        contribution: this.initialValue
      },
      contributionMaxChar: GROUP_NON_MONETARY_CONTRIBUTION_MAX_CHAR
    }
  },
  computed: {
    itemClasses () {
      return [
        `c-item is-${this.variant}`,
        { 'has-controls': this.isEditable }
      ]
    },
    isEditable () {
      return this.variant === 'editable'
    },
    isUnfilled () {
      return this.variant === 'unfilled'
    },
    receiverHasOnlyOneItem () {
      return this.needsIncome && this.contributionsList?.length === 1
    },
    showRemoveBtn () {
      return this.isEditing && !this.isAdding && !this.receiverHasOnlyOneItem
    },
    editAriaLabel () {
      return L('Edit contribution settings')
    },
    randomPlaceholder () {
      return this.placeholders[Math.floor(Math.random() * this.placeholders.length)]
    },
    contributionCharLen () {
      const len = this.form.contribution?.length || 0
      return `${len}/${this.contributionMaxChar}`
    }
  },
  methods: {
    handleEditClick (e) {
      this.isEditing = true
      this.isFilled = !!this.initialValue
      this.form.contribution = this.initialValue
    },
    verifyValue (event) {
      this.isFilled = !!event.target.value
    },
    cancel () {
      this.isAdding = false
      this.isEditing = false
      this.isFilled = false
    },
    handleEnter (e) {
      if (this.isAdding && !this.isFilled) {
        this.setError()
        return false
      }
      return this.isFilled ? this.handleSubmit() : this.handleDelete()
    },
    async handleDelete () {
      await this.$listeners['new-value']('nonMonetaryRemove', this.initialValue)
      this.cancel()
    },
    async handleSubmit () {
      if (this.$v.form.$invalid) {
        this.cancel()
      } else {
        if (this.isAdding) {
          const value = this.form.contribution
          this.form.contribution = null
          this.$v.$reset() // workaround #858
          await this.$listeners['new-value']('nonMonetaryAdd', value)
          this.isAdding = false
        }
        if (this.isEditing) {
          await this.$listeners['new-value']('nonMonetaryEdit', {
            replace: this.initialValue,
            with: this.form.contribution
          })
          this.isEditing = false
        }
      }
    }
  },
  directives: {
    focus: {
      inserted (el, binding, vnode) {
        // This was the only working way I've found to set "contribution" as defaultValue
        if (binding.value) { el.value = binding.value }
        el.focus()
      }
    }
  },
  validations: {
    form: {
      contribution: {
        [L('A contribution is required.')]: required,
        [L('This contribution already exists.')]: function (x) {
          return !this.contributionsList || !this.contributionsList.includes(x)
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-contribution {
  padding: 1.5rem 0 1rem 0;
}

.c-item.is-default {
  display: flex;
}

.c-contribution-edit {
  &:first-child,
  .c-contribution + .c-contribution {
    padding-top: 0;
  }

  & + .c-spacer-above .c-contribution {
    padding-top: 1rem;
  }
}

.c-spacer-above {
  padding-top: 1.5rem;
}

.c-label-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.625rem;

  .c-char-len {
    font-size: $size_5;
    color: $text_1;
  }
}

.c-helper {
  display: flex;
  align-items: flex-start;
  column-gap: 0.25rem;
  color: $text_1;
  margin-top: 0.5rem;
  font-size: $size_4;
}

.buttons {
  padding-top: 1rem;
  padding-bottom: 0.25rem;
  margin-top: 0;

  button {
    margin-top: 0;
  }
}

.c-inline-button {
  margin-left: 1rem;

  .icon-pencil-alt {
    margin-left: 0;
  }
}

.has-controls {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.c-buttons-right {
  display: flex;
  justify-content: flex-end;
  flex-grow: 1;
}

.button + .c-buttons-right {
  width: auto;
}
</style>
