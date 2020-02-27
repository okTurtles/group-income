<template lang='pug'>
fieldset(data-test='paymentMethods')
  legend.has-text-bold.c-legend
    i18n.is-title-4 Payment info
    | &nbsp;
    i18n.has-text-1.has-text-small.c-optional (optional)
  i18n.has-text-1 Other group members will be able to use this information to send you monthly contributions.

  ul.c-fields(ref='fields' data-test='fields')
    li.c-fields-item(
      v-for='(method, index) in form.methods'
      :key='`method-${index}`'
      data-test='method'
    )
      .select-wrapper.is-reversed(:class='{"is-shifted": methodsCount > 1 }')
        label
          .sr-only Payment name
          select.select(v-model='method.name'
            :class='{ "is-empty": method.name === "choose"}'
            @change='e => handleSelectChange(e, index)'
          )
            i18n(tag='option' value='choose' disabled='true') Choose...
            option(v-for='(option, key) in config.options' :value='key') {{ option }}

        label.c-select-input
          .sr-only Payment description
          input.input(
            type='text'
            v-model='method.value'
          )
        button.is-icon-small.is-btn-shifted(
          type='button'
          :aria-label='L("Remove method")'
          @click='removeMethod(index)'
          data-test='remove'
        )
          i.icon-times

  button.link.has-icon(
    type='button'
    @click='handleAddMethod'
    data-test='addMethod'
  )
    i.icon-plus
    i18n Add more
</template>

<script>
import { mapGetters } from 'vuex'
import Vue from 'vue'
import L from '@view-utils/translations.js'

export default {
  name: 'PaymentMethods',
  components: {},
  data: () => ({
    config: {
      options: {
        // key to store on state and corresponding translation (if needed)
        bitcoin: 'Bitcoin',
        paypal: 'Paypal',
        venmo: 'Venmo',
        other: L('Other')
      }
    },
    form: {
      methods: []
    }
  }),
  created () {
    const savedMethods = this.ourGroupProfile.paymentMethods || {}
    const savedMethodsKeys = Object.keys(savedMethods)
    const savedMethodsCount = savedMethodsKeys.length

    if (savedMethodsCount === 0) {
      // set the minimum necessary to show the first empty field.
      Vue.set(this.form.methods, 0, {
        name: 'choose',
        value: ''
      })
      return
    }

    for (let index = 0; index < savedMethodsCount; index++) {
      const method = savedMethodsKeys[index]
      Vue.set(this.form.methods, index, {
        name: method,
        value: this.ourGroupProfile.paymentMethods[method].value
      })
    }
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'ourGroupProfile'
    ]),
    methodsCount () {
      return Object.keys(this.form.methods).length
    }
  },
  methods: {
    handleSelectChange (e, index) {
      // Reset the respective input and focus on it
      Vue.set(this.form.methods, index, {
        name: e.target.value,
        value: ''
      })
      Vue.nextTick(() => {
        this.$refs.fields.childNodes[index].getElementsByTagName('label')[1].focus()
      })
    },
    handleAddMethod () {
      Vue.set(this.form.methods, this.methodsCount, {
        name: 'choose',
        value: ''
      })
    },
    removeMethod (index) {
      this.form.methods.splice(index, 1)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-optional {
  font-weight: 400;
}

.c-legend {
  margin-bottom: $spacer-xs;
}

.c-fields {
  margin-top: $spacer;

  &-item {
    display: block;
    margin-bottom: $spacer;
  }
}

// TODO - Review & Refactor to forms.scss at #833 and #831
.select-wrapper {
  .is-btn-shifted {
    display: none;
    position: absolute;
    top: 0.5rem;
    left: calc(100% + 0.5rem);
  }

  &.is-shifted {
    width: calc(100% - 2.5rem); // space for .btn-shift (X)

    .is-btn-shifted {
      display: block;
    }
  }

  .select {
    min-width: 7rem;

    &.is-empty {
      color: $text_1;
    }
  }

  &::after { // icon-sort-down
    left: 5.5rem;
  }
}

.c-select-input {
  flex-grow: 1;
}
</style>
