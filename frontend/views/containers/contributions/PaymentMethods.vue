<template lang='pug'>
fieldset(data-test='paymentMethods')
  legend.has-text-bold.c-legend
    i18n.is-title-4 Payment info

  i18n.has-text-1 Other group members will be able to use this information to send you monthly contributions.

  ul.c-fields(ref='fields' data-test='fields')
    li.c-fields-item(
      v-for='(method, index) in form.methods'
      :key='`method-${index}`'
      data-test='method'
    )
      fieldset
        .selectgroup.is-reversed.c-select(
          :class='{"is-shifted": methodsCount > 1 || method.name !== "choose" || method.value }'
        )
          select.select(
            v-model='method.name'
            :class='{ "is-empty": method.name === "choose"}'
            :aria-label='L("Payment method")'
            @change='handleSelectChange($event.target.value, index)'
          )
            i18n(tag='option' value='choose' disabled='true') Choose...
            option(v-for='(option, key) in config.options' :value='key') {{ option }}
          input.input(
            type='text'
            v-model='method.value'
            :aria-label='L("Payment value")'
            :class='{error: $v.form.methods.$each[index].value.$error}'
          )
          button.is-icon-small.is-btn-shifted(
            type='button'
            :aria-label='L("Remove method")'
            @click='removeMethod(index)'
            data-test='remove'
          )
            i.icon-times
        span.error(v-if='$v.form.methods.$each[index].value.$error') {{ getFirstErrorMessage(index) }}

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
import { validationMixin } from 'vuelidate'
import { Vue, L } from '@common/common.js'
import { maxLength, required } from 'vuelidate/lib/validators'
import { GROUP_PAYMENT_METHOD_MAX_CHAR } from '@model/contracts/shared/constants.js'

export default ({
  name: 'PaymentMethods',
  components: {},
  mixins: [validationMixin],
  data: () => ({
    config: {
      options: {
        // Key to store on the state and corresponding translation.
        bitcoin: L('Bitcoin'),
        lightning: L('Lightning'),
        paypal: L('Paypal'),
        venmo: L('Venmo'),
        other: L('Other')
      }
    },
    form: {
      methods: []
    },
    savedMethods: []
  }),
  validations () {
    return {
      form: {
        methods: {
          $each: {
            value: {
              [L('Payment info is required.')]: required,
              [L('Payment info cannot exceed {maxChars} characters.', {
                maxChars: GROUP_PAYMENT_METHOD_MAX_CHAR
              })]: maxLength(GROUP_PAYMENT_METHOD_MAX_CHAR)
            }
          }
        }
      }
    }
  },
  created () {
    this.savedMethods = this.ourGroupProfile.paymentMethods || []
    const savedMethodsCount = this.savedMethods.length

    if (savedMethodsCount === 0) {
      // set the minimum necessary to show the first empty field.
      Vue.set(this.form.methods, 0, {
        name: 'choose',
        value: ''
      })
      return
    }

    for (let index = 0; index < savedMethodsCount; index++) {
      const method = this.savedMethods[index]
      Vue.set(this.form.methods, index, {
        name: method.name,
        value: method.value
      })
    }
  },
  computed: {
    ...mapGetters([
      'ourGroupProfile'
    ]),
    methodsCount () {
      return Object.keys(this.form.methods).length
    }
  },
  methods: {
    handleSelectChange (methName, index) {
      // Focus the respective input
      this.$refs.fields.childNodes[index].getElementsByTagName('input')[0].focus()
    },
    getFirstErrorMessage (index) {
      const cur = this.$v.form.methods.$each[index].value
      if (cur.$error) {
        for (const key in cur.$params) {
          if (!cur[key]) {
            return key
          }
        }
      }
      return ''
    },
    handleAddMethod () {
      Vue.set(this.form.methods, this.methodsCount, {
        name: 'choose',
        value: ''
      })
    },
    removeMethod (index) {
      if (this.form.methods.length > 1) {
        // Remove the method from the list
        this.form.methods.splice(index, 1)
      } else {
        // Reset the method if it's the only one
        Vue.set(this.form.methods, 0, {
          name: 'choose',
          value: ''
        })
      }
    },
    checkHasUpdates () {
      // check if the payment details have been updated since load.
      const entriesToCheck = this.form.methods.filter(method => method.name !== 'choose')

      if (entriesToCheck.length !== this.savedMethods.length) return true
      else {
        return entriesToCheck.some(
          method => this.savedMethods.findIndex(saved => saved.name === method.name && saved.value === method.value) === -1
        )
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-optional {
  font-weight: 400;
}

.c-legend {
  margin-bottom: 0.25rem;
}

.c-fields {
  margin-top: 1rem;

  &-item {
    display: block;
    margin-bottom: 1rem;
  }
}

.c-select {
  .select {
    min-width: 7rem;
  }

  &::after { // icon-sort-down
    left: 5.5rem;
  }

  .is-btn-shifted {
    display: none;
  }

  &.is-shifted {
    .is-btn-shifted {
      display: block;
    }
  }
}
</style>
