<template lang='pug'>
modal-template(ref='modal' :a11yTitle='modalTitle')
  template(slot='title')
    span {{ modalTitle }}

  i18n.c-sub-title.has-text-1(:args='{ type: $route.query.type }') Export your {type} payment history to .csv

  label.field
    i18n.label Payment period

    .selectbox
      select.select.c-period-select(
        name='period'
        required=''
        v-model='form.period'
      )
        option(
          v-for='n in 30'
          :key='"duration-" + n'
          :value='n'
        ) {{ n }}

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
import { L } from '@common/common.js'

export default ({
  name: 'ExportPaymentsModal',
  components: {
    ModalTemplate
  },
  data () {
    return {
      form: {
        period: null
      }
    }
  },
  computed: {
    modalTitle () {
      return L('Export {type} payments', { type: this.$route.query.type })
    }
  },
  methods: {
    close () {
      this.$refs.modal.close()
    },
    exportToCSV () {
      alert('TODO: Implement!')
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
</style>
