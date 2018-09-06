<template>
  <li v-if="isEditing || isAdding" class="c-item">
    <p class="field has-addons gi-has-addons c-form">
      <input ref="input" type="text"
        class="input"
        :placeholder="randomPlaceholder"
        maxlength="20"
        :aria-label="L('Your contribution')"
        :aria-invalid="hasError"
        v-focus="isEditing && $slots.default[0].text"
        @keyup="verifyValue"
        @keyup.esc="cancel"
        @keyup.enter="handleEnter"
      >

      <i18n tag="button" class="button" @click="cancel">Cancel</i18n>
      <i18n tag="button" class="button has-text-primary" v-if="isAdding && isFilled" @click="handleSubmit">Add</i18n>
      <i18n tag="button" class="button has-text-primary" v-if="isEditing && isFilled" @click="handleSubmit">Save</i18n>
      <i18n tag="button" class="button has-text-danger" v-if="isEditing && !isFilled" @click="handleDelete">Delete</i18n>
    </p>
    <p v-if="hasError" class="is-size-7 has-text-weight-normal has-text-danger c-error" role="alert">{{this.hasError}}</p>
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
@import "../../assets/sass/theme/index";

.c-item {
  margin-bottom: $gi-spacer * 0.75;
}

.c-contribution,
.c-form {
  min-height: 2.8125rem; // 45px - input and box are aligned to the pixel
}

.c-error {
  margin-top: -$gi-spacer-sm; // reduce the spacing between error and input
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
      hasError: false,
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
    hasControlClickListener () {
      return !!this.$listeners['control-click']
    },
    editAriaLabel () {
      return this.L('Edit contribution settings')
    },
    randomPlaceholder () {
      return this.placeholders[Math.floor(Math.random() * this.placeholders.length)]
    },
    iconClass () {
      return this.hasControlClickListener ? 'fa-ellipsis-v' : 'fa-edit'
    }
  },
  methods: {
    handleClick () {
      if (this.hasControlClickListener) {
        this.$emit('control-click')
      } else {
        this.isAdding = true
      }
    },
    handleEditClick (e) {
      if (this.hasControlClickListener) {
        this.$emit('control-click')
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
      // BUG: when press  Enter on edit button,
      // it also triggers the Enter key on input calling this event
      // somethin about directive, focus or stopPropagation... still need to check it
      this.isFilled ? this.handleSubmit() : this.handleDelete()
    },
    handleDelete () {
      this.$emit('new-value', this.$refs.input.value)
      this.cancel()
    },
    handleSubmit () {
      const text = this.$refs.input.value

      if (text.trim() === '') {
        this.hasError = this.L(`Whitespace characters aren't really a contribution`)
      } else {
        this.$emit('new-value', text)
        this.cancel()
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
  }
}
</script>
