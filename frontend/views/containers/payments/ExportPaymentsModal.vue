<template lang='pug'>
modal-template(ref='modal' :a11yTitle='modalTitle')
  template(slot='title')
    span {{ modalTitle }}

  i18n.c-sub-title.has-text-1(:args='{ type: paymentType }') Export your {type} payment history to .csv

  .c-all-period-checkbox
    label.checkbox
      input.input(
        type='checkbox'
        name='all-period'
        v-model='form.allPeriod'
      )
      i18n Export all periods

  label.field
    .label
      i18n Payment period

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
      :disabled='!form.allPeriod && form.period === "choose"'
    ) Export payments

    a.c-invisible-download-helper(
      ref='downloadHelper'
      :download='ephemeral.downloadName'
    )
</template>

<script>
import { mapGetters } from 'vuex'
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
        periodOpts: [],
        downloadUrl: '',
        downloadName: ''
      }
    }
  },
  props: {
    data: Array
  },
  computed: {
    ...mapGetters([
      'userDisplayName',
      'withGroupCurrency'
    ]),
    modalTitle () {
      return L('Export {type} payments', { type: this.paymentType })
    },
    paymentType () {
      return this.$route.query.type
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
      // logic here is inspired from the article below:
      // https://medium.com/@idorenyinudoh10/how-to-export-data-from-javascript-to-a-csv-file-955bdfc394a9
      const itemsToExport = this.form.allPeriod
        ? this.data
        : this.data.filter(
          entry => entry.period === this.form.period
        )

      const tableHeadings = [
        this.paymentType === 'sent' ? L('Sent to') : L('Sent by'),
        L('Amount'),
        L('Payment method'),
        L('Date & Time'),
        L('Period'),
        L('Mincome at the time')
      ]
      const tableRows = itemsToExport.map(entry => {
        return [
          this.paymentType === 'sent'
            ? this.userDisplayName(entry.data.toUser)
            : this.userDisplayName(entry.meta.username), // 'Sent by' or 'Sent to'
          this.withGroupCurrency(entry.data.amount), // 'Amount',
          L('Manual'), // 'Payment metod' - !!TODO: once lightning payment is implemented in the app, update the logic here too.
          humanDate(
            entry.meta.createdDate,
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }
          ).replaceAll(',', ''), // 'Date & Time'
          humanDate(
            entry.period,
            { month: 'long', year: 'numeric', day: 'numeric' }
          ).replaceAll(',', ''), // 'Period'
          this.withGroupCurrency(entry.data.groupMincome) // Mincome at the time
        ]
      })

      let csvContent = tableHeadings.join(',') + '\r\n'
      for (const row of tableRows) {
        csvContent += row.join(',') + '\r\n'
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' })
      const downloadUrl = URL.createObjectURL(blob)
      this.ephemeral.downloadName = `${this.paymentType === 'sent' ? L('Sent') : L('Received')} payments.csv`
      this.$refs.downloadHelper.setAttribute('href', downloadUrl)

      this.$nextTick(() => {
        this.$refs.downloadHelper.click()
      })
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
}

.c-btns-container {
  position: relative;
  margin-top: 2rem;
  width: 100%;
  justify-content: space-between;
}

.c-all-period-checkbox {
  position: relative;
  margin-top: 0.25rem;
  margin-bottom: 1.5rem;
  width: 100%;

  .checkbox {
    margin-right: 0;
  }
}

.c-invisible-download-helper {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
</style>
