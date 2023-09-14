<template lang='pug'>
modal-template(ref='modal' :a11yTitle='modalTitle')
  template(slot='title')
    span {{ modalTitle }}

  i18n.c-sub-title.has-text-1(:args='{ type: $route.query.type }') Export your {type} payment history to .csv

  label.field
    .label.c-select-label
      i18n Payment period

      label.checkbox.c-all-period-checkbox
        input.input(
          type='checkbox'
          name='all-period'
          v-model='form.allPeriod'
        )
        i18n Export all periods

    .selectbox
      select.select.c-period-select(
        name='period'
        required=''
        :disabled='form.allPeriod'
        v-model='form.period'
        :class='{ "is-empty": form.period === "choose" }'
      )
        option(
          value='choose'
          :disabled='true'
        )
          i18n Select payment period

        option(
          v-for='period in ephemeral.periodOpts'
          :key='period'
          :value='period'
        ) {{ displayPeriod(period) }}

  .buttons.c-btns-container
    i18n.is-outlined(
      tag='button'
      type='button'
      @click='close'
    ) Cancel

    i18n(
      tag='button'
      @click='exportToCSV'
    ) Export payments
</template>

<script>
import ModalTemplate from '@components/modal/ModalTemplate.vue'
import { uniq } from '@model/contracts/shared/giLodash.js'
import { humanDate } from '@model/contracts/shared/time.js'
import { L } from '@common/common.js'

export default ({
  name: 'ExportPaymentsModal',
  components: {
    ModalTemplate
  },
  data () {
    return {
      form: {
        period: 'choose',
        allPeriod: false
      },
      ephemeral: {
        periodOpts: []
      }
    }
  },
  props: {
    data: Array
  },
  computed: {
    modalTitle () {
      return L('Export {type} payments', { type: this.$route.query.type })
    }
  },
  methods: {
    displayPeriod (period) {
      return humanDate(period, { month: 'short', day: 'numeric', year: 'numeric' })
    },
    close () {
      this.$refs.modal.close()
    },
    exportToCSV () {
      alert('TODO: Implement!')
    }
  },
  mounted () {
    if (this.data?.length) {
      this.ephemeral.periodOpts = uniq(this.data.map(entry => entry.period))
    } else {
      this.close()
    }
  }
})
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-sub-title {
  position: relative;
  width: 100%;
  text-align: left;
  margin-bottom: 1.5rem;
}

.c-btns-container {
  position: relative;
  margin-top: 2rem;
  width: 100%;
  justify-content: space-between;
}

.c-select-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-all-period-checkbox {
  margin-right: 0;
}
</style>
