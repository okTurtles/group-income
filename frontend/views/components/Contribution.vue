<template lang='pug'>
li.c-item(v-if='isEditing || isAdding')
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
  i18n.button(
    tag='button'
    @click='cancel'
  ) Cancel
  i18n.button.is-outlined(
    v-if='isAdding && isFilled'
    tag='button'
    @click='handleSubmit'
  ) Add
  i18n.button.is-outlined(
    v-if='isEditing && isFilled'
    tag='button'
    @click='handleSubmit'
  ) Save
  i18n.button.is-danger.is-outlined(
    v-if='isEditing && !isFilled'
    tag='button'
    @click='handleDelete'
  ) Delete
  p.error(v-if='hasError' role='alert') {{this.hasError}}

li(v-else-if='isEditable' :class='itemClasses')
  slot

  button.is-icon(:aria-label='editAriaLabel' @click='handleEditClick')
    i.icon-edit(aria-hidden='true')

li(v-else-if='isUnfilled')
  button(:class='itemClasses' @click='handleClick')
    slot

li(v-else='' :class='itemClasses')
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
</style>
