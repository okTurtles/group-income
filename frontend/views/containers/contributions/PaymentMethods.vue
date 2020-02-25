<template lang='pug'>
fieldset(data-test='paymentInfo')
  legend.has-text-bold.c-legend
    i18n Payment info
    | &nbsp;
    i18n.has-text-1.has-text-small (optional)
  i18n.has-text-1 Other group members will be able to use this information to send you monthly contributions.

  ul.c-fields(ref='fields')
    li.c-fields-item(
      v-for='(method, index) in ephemeral.methodsCount'
      :key='`method-${index}`'
      data-test='method'
    )
      .select-wrapper.is-reversed.is-shifted
        label
          .sr-only Payment name
          select.select(v-model='form.methods[index].select'
            :class='{ "is-empty": form.methods[index].select === "choose"}'
            @change='e => handleSelectChange(e, index)'
          )
            i18n(tag='option' value='choose' disabled='true') Choose...
            option(v-for='(option, key) in config.options' :value='key') {{ option }}

        label.c-select-input
          .sr-only Payment description
          input.input(
            type='text'
            v-model='form.methods[index].input'
            :disabled='form.methods[index].select === "choose"'
          )
        button.is-icon-small.is-btn-shifted(
          v-if='ephemeral.methodsCount > 1'
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
  props: {
    // @select - emit
  },
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
    },
    ephemeral: {
      methodsCount: 1
    }
  }),
  created () {
    const methods = Object.keys(this.paymentMethods)
    const methodsCount = methods.length

    if (methodsCount === 0) {
      // set the minimum necessary to show the first empty field.
      this.ephemeral.methodsCount = 1
      Vue.set(this.form.methods, 0, {
        select: 'choose',
        input: ''
      })
      return
    }

    for (let index = 0; index < methodsCount; index++) {
      const method = methods[index]
      Vue.set(this.form.methods, index, {
        select: method,
        input: this.paymentMethods[method].value
      })
    }

    this.ephemeral.methodsCount = methodsCount
  },
  computed: {
    ...mapGetters([
      'ourUsername',
      'ourGroupProfile'
    ]),
    paymentMethods () {
      return this.ourGroupProfile.paymentMethods || {}
    }
  },
  methods: {
    handleSelectChange (e, index) {
      // Reset the respective input and focus on it
      Vue.set(this.form.methods, index, {
        select: e.target.value,
        input: ''
      })
      Vue.nextTick(() => {
        this.$refs.fields.childNodes[index].getElementsByTagName('label')[1].focus()
      })
    },
    handleAddMethod () {
      Vue.set(this.form.methods, this.ephemeral.methodsCount, {
        select: 'choose',
        input: ''
      })
      this.ephemeral.methodsCount += 1
    },
    removeMethod (index) {
      this.form.methods.splice(index, 1)
      this.ephemeral.methodsCount -= 1
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
