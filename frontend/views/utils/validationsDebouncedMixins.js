import { debounce } from '@utils/giLodash.js'

/**
Methods to debounce vuelidate validations.
Don't forget to add v-model to the input where you use these.

Ex:

// -- Using v-model

input.input(
  :class='{error: $v.form.email.$error}'
  type='email'
  v-model='form.email'
  @input='debounceField("email")'
  @blur='updateField("email")'
  v-error:email=''
)

// -- Without v-model
input.input(
  :class='{error: $v.form.name.$error}'
  name='username'
  @input='e => debounceField("username", e.target.value)'
  @blur='e => updateField("username", e.target.value)'
  v-error:username=''
)

// -- Debounce both validation and $error feedback (cannot use v-model)
input.input(
  :class='{error: $v.form.name.$error}'
  name='username'
  @input='e => debounceValidation("username", e.target.value)'
  @blur='e => updateField("username", e.target.value)'
  v-error:username=''
)
*/

export default {
  methods: {
    /**
     * Validate the field but debounce the visual error ($error).
     * - It avoids showing the error while the user is still typing.
     */
    debounceField (fieldName, value) {
      const $vFieldName = this.$v.form[fieldName]
      // Do a field validation, but don't show $error immediately
      $vFieldName.$reset()
      // Wait a little to make sure the user stopped typing...
      this.debounceValidation(fieldName, value)
    },

    /**
     * Debounce field validations.
     * - Useful when you want to debounce expensive validations.
     */
    debounceValidation: debounce(function (fieldName, value) {
      this.updateField(fieldName, value)
    }, 1000),

    /**
     * Validate the field and update it immediatelly.
     * - Usually used on @blur.
     */
    updateField (fieldName, value) {
      if (value) { // it means it needs to be a manually binded
        this.form[fieldName] = value
      }
      this.$v.form[fieldName].$touch()
    }
  }
}
