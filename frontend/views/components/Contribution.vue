<template lang='pug'>
transition(name='replacelist')
  li.c-contribution(v-if='isEditing || isAdding' key=1)
    input.input(
      type='text'
      ref='input'
      :placeholder='randomPlaceholder'
      maxlength='20'
      :aria-label='L("Your contribution")'
      :aria-invalid='hasError'
      v-focus='isEditing && $slots.default[0].text'
      @keyup='verifyValue'
      @keydown.esc='cancel'
      @keydown.enter='handleEnter'
    )
    .buttons
      i18n.button.is-small.is-danger.is-outlined(
        v-if='isEditing && !isAdding'
        tag='button'
        @click='handleDelete'
      ) Remove
      .c-buttons-right
        i18n.button.is-small.is-outlined(
          tag='button'
          @click='cancel'
        ) Cancel
        i18n.button.is-small(
          v-if='isAdding && isFilled'
          tag='button'
          @click='handleSubmit'
        ) Add
        i18n.button.is-small(
          v-if='isEditing && isFilled'
          tag='button'
          @click='handleSubmit'
        ) Save

    p.error.c-spacer-above(v-if='hasError' role='alert') {{this.hasError}}

  li(v-else-if='isEditable' :class='itemClasses' key=2)
    slot

    button.button.is-small.is-outlined.c-inline-button(
      :aria-label='editAriaLabel'
      @click='handleEditClick'
    )
      i.icon-pencil-alt(aria-hidden='true')
      | {{ L('Edit') }}

  li.c-spacer-above(v-else-if='isUnfilled' key=3)
    button.button.is-small(
      :class='itemClasses'
      @click='handleClick'
    )
      slot

  li(v-else='' :class='itemClasses' key=4)
    slot
</template>

<script>
export default {
  name: 'Contribution',
  props: {
    variant: {
      type: String,
      validator (value) {
        return [
          'default', // light box just to read the content
          'unfilled', // dashed box interactive to add a new contribution
          'editable' // blue box to edit a contribution
        ].indexOf(value) > -1
      },
      default: 'default'
    },
    // When true doesn't show the input to edit the contribution text.
    // Let the parent decide what to do using @interaction
    isMonetary: Boolean
  },
  data () {
    return {
      isAdding: false,
      isEditing: false,
      isFilled: null, // decide what input buttons to show
      hasError: false,
      placeholders: [this.L('Portuguese classes'), this.L('Programming'), this.L('Cooking'), this.L('Parties'), this.L('Free cinema tickets')]
    }
  },
  computed: {
    itemClasses () {
      return [
        `is-${this.variant}`,
        { 'has-controls': this.isEditable }
      ]
    },
    isEditable () {
      return this.variant === 'editable'
    },
    isUnfilled () {
      return this.variant === 'unfilled'
    },
    editAriaLabel () {
      return this.L('Edit contribution settings')
    },
    randomPlaceholder () {
      return this.placeholders[Math.floor(Math.random() * this.placeholders.length)]
    }
  },
  methods: {
    handleClick () {
      if (this.isMonetary) {
        this.$emit('interaction')
      } else {
        this.isAdding = true
      }
    },
    handleEditClick (e) {
      if (this.isMonetary) {
        this.$emit('interaction')
      } else {
        this.isEditing = true
        this.isFilled = true
      }
    },
    verifyValue (event) {
      this.isFilled = !!event.target.value
    },
    cancel () {
      this.isAdding = false
      this.isEditing = false
      this.isFilled = false
      this.hasError = false
    },
    handleEnter (e) {
      if (this.isAdding && !this.isFilled) {
        this.setError()
        return false
      }

      return this.isFilled ? this.handleSubmit() : this.handleDelete()
    },
    handleDelete () {
      this.$emit('new-value', this.$refs.input.value)
      this.cancel()
    },
    handleSubmit () {
      const text = this.$refs.input.value

      if (text.trim() === '') {
        this.setError()
      } else {
        this.$emit('new-value', text)
        this.cancel()
      }
    },
    setError () {
      this.hasError = this.L('Whitespace characters aren\'t really a contribution')
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
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";
.c-contribution {
  padding: $spacer * 1.5 0 $spacer 0;

  &:first-child,
  & + .c-contribution{
    padding-top: 0;
  }

  & + .c-spacer-above{
    padding-top: $spacer;
  }
}

.c-spacer-above {
  padding-top: $spacer * 1.5;
}

.c-buttons-right {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.buttons {
  margin-top: $spacer-sm;
  margin-bottom: $spacer-xs;
}

.button + .c-buttons-right {
  width: auto;
}

.c-inline-button {
  margin-left: $spacer;
  .icon-pencil-alt {
    margin-left: 0;
  }
}

.has-controls {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
</style>
