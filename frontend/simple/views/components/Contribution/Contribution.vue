<template>
  <li class="field has-addons gi-has-addons c-form"
    v-if="isEditing || isAdding"
  >
    <input ref="input" type="text"
      class="input"
      :placeholder="randomPlaceholder"
      maxlength="20"
      v-focus="isEditing && $slots.default[0].text"
      @keyup="verifyValue"
      @keyup.esc="cancel"
      @keyup.enter="handleSubmit"
    >

    <i18n tag="button" class="button" @click="cancel">Cancel</i18n>
    <i18n tag="button" class="button has-text-primary" v-if="isAdding && isFilled" @click="handleSubmit">Add</i18n>
    <i18n tag="button" class="button has-text-primary" v-if="isEditing && isFilled" @click="handleSubmit">Save</i18n>
    <i18n tag="button" class="button has-text-danger" v-if="isEditing && !isFilled" @click="handleSubmit">Delete</i18n>
  </li>

  <li v-else-if="isEditable" :class="itemClasses">
    <p class="box-body">
      <slot></slot>
    </p>
    <div class="box-controls">
      <button
        class="button is-icon"
        :aria-label="editAriaLabel"
        @click="handleEditClick"
      >
        <i class="fa" :class="iconClass" aria-hidden="true"></i>
      </button>
    </div>
  </li>

  <li v-else-if="isUnfilled">
    <button :class="itemClasses" @click="handleClick">
      <slot></slot>
    </button>
  </li>

  <li v-else :class="itemClasses">
    <slot></slot>
  </li>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-contribution,
.c-form {
  min-height: 45px;
}

.c-contribution {
  width: 100%;
  font-size: inherit;

  &.is-default {
    border: none;
    background-color: $white-ter;
  }

  &.is-editable {
    border: none;
    background-color: $primary-bg-a;
  }

  &.is-unfilled {
    cursor: pointer;
    text-align: left;

    &:hover,
    &:focus {
      background-color: $primary-bg-a;
    }
  }

  &-icon {
    color: $primary;
    margin-right: $gi-spacer-sm;
  }
}
</style>
<script>
export default {
  name: 'Contribution',
  props: {
    variant: {
      type: String,
      validator (value) {
        return [
          'default', // grey box just to read the content
          'unfilled', // dashed box interactive to add a new contribution
          'editable' // blue box to edit a contribution
        ].indexOf(value) > -1
      },
      default: 'default'
    }
  },
  data () {
    return {
      isAdding: false,
      isEditing: false,
      isFilled: null, // when true, show add/save button.
      placeholders: [this.L('Portuguese classes'), this.L('Programming'), this.L('Cooking'), this.L('Parties'), this.L('Free cinema tickets')]
    }
  },
  computed: {
    itemClasses () {
      return [
        'box is-compact c-contribution',
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
    },
    iconClass () {
      return this.$listeners.click ? 'fa-ellipsis-v' : 'fa-edit'
    }
  },
  methods: {
    handleClick () {
      if (this.$listeners.click) {
        this.$listeners.click()
      } else {
        this.isAdding = true
      }
    },
    handleEditClick () {
      if (this.$listeners.click) {
        this.$listeners.click()
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
    },
    handleSubmit () {
      this.$emit('new-value', this.$refs.input.value)
      this.cancel()
    }
  },
  directives: {
    focus: {
      inserted (el, binding) {
        // This was the only working way I've found to set "contribution" as defaultValue
        if (binding.value) { el.value = binding.value }
        el.focus()
      }
    }
  }
}
</script>
