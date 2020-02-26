<template lang='pug'>
fieldset(data-test='paymentMethods')
  legend.has-text-bold.c-legend
    i18n Payment info
    | &nbsp;
    i18n.has-text-1.has-text-small (optional)
  i18n.has-text-1 Other group members will be able to use this information to send you monthly contributions.

  ul.c-fields(ref='fields' data-test='fields')
    li.c-fields-item(
      v-for='(method, index) in form.methods'
      :key='`method-${index}`'
      data-test='method'
    )
      .select-wrapper.is-reversed.is-shifted
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
            :disabled='method.name === "choose"'
          )
        button.is-icon-small.is-btn-shifted(
          v-if='methodsCount > 1'
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

/* TODO - review/isolate to forms.scss at #834 */

.select.is-empty {
  color: $text_1;
}

.c-select-input {
  flex-grow: 1;
}
</style>
