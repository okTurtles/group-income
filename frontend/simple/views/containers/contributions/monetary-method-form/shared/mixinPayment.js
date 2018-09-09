import currencies from '../../../../utils/currencies.js'
import MonetaryMethodTemplate from './MonetaryMethodTemplate.vue'
import ManualPayment from './ManualPayment.vue'
import BitcoinPayment from './BitcoinPayment.vue'

export default {
  components: {
    MonetaryMethodTemplate,
    ManualPayment,
    BitcoinPayment
  },
  data () {
    return {
      methodActive: 'manual'
    }
  },
  computed: {
    groupCurrency () {
      const groupCurrency = 'USD'
      return `${currencies[groupCurrency]} ${groupCurrency}`
    }
  },
  methods: {
    updatePaymentMethod (method) {
      this.methodActive = method
    }
  }
}
