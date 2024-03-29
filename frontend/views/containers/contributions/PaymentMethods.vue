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
          select.select(v-model='method.name'
            :class='{ "is-empty": method.name === "choose"}'
            :aria-label='L("Payment method")'
            @change='handleSelectChange($event.target.value, index)'
          )
            i18n(tag='option' value='choose' disabled='true') Choose...
            option(v-for='(option, key) in config.options' :value='key') {{ option }}
          input.input(
            type='text'
            :aria-label='L("Payment value")'
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
import { Vue, L } from '@common/common.js'

export default ({
  name: 'PaymentMethods',
  components: {},
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
    }
  }),
  created () {
    const savedMethods = this.ourGroupProfile.paymentMethods || []
    const savedMethodsCount = savedMethods.length

    if (savedMethodsCount === 0) {
      // set the minimum necessary to show the first empty field.
      Vue.set(this.form.methods, 0, {
        name: 'choose',
        value: ''
      })
      return
    }

    for (let index = 0; index < savedMethodsCount; index++) {
      const method = savedMethods[index]
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
