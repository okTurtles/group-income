<template lang='pug'>
.card
  form(@submit.prevent='')
    label.field
      .c-label-container
        i18n.label Default currency
        .c-coming-soon
          i.icon-info-circle
          i18n Feature coming soon

      i18n.helper.c-helper This is the currency that will be displayed for every member of the group, across the platform.

      .selectbox.c-currency
        select.select(
          name='mincomeCurrency'
          v-model='form.mincomeCurrency'
          :disabled='true'
        )
          option(
            v-for='(currency, code) in currencies'
            :value='code'
            :key='code'
          ) {{ currency.symbolWithCode }}

    banner-scoped(ref='formMsg' data-test='formMsg' :allowA='true')

    .buttons.is-end(v-if='showSaveButton')
      button-submit.is-success(
        @click='saveGroupCurrency'
        data-test='saveBtn'
      ) {{ L('Save currency') }}
</template>

<script>
import { L } from '@common/common.js'
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import currencies from '@model/contracts/shared/currencies.js'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'

export default {
  name: 'UpdateGroupCurrency',
  components: {
    ButtonSubmit,
    BannerScoped
  },
  data () {
    return {
      form: {
        mincomeCurrency: this.$store.getters.groupSettings.mincomeCurrency
      }
    }
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings'
    ]),
    currencies () {
      return currencies
    },
    showSaveButton () {
      return false // TODO: remove this once the feature is implemented
    }
  },
  methods: {
    refreshForm () {
      this.form = {
        mincomeCurrency: this.groupSettings.mincomeCurrency
      }
    },
    async saveGroupCurrency () {
      if (this.$v.form.$invalid) {
        this.$refs.formMsg.danger(L('The form is invalid.'))
        return
      }

      try {
        await sbp('gi.actions/group/updateSettings', {
          contractID: this.currentGroupId,
          data: { mincomeCurrency: this.form.mincomeCurrency }
        })

        this.$refs.formMsg.success(L('Your changes were saved!'))
      } catch (e) {
        console.error('GroupSettings saveGroupCurrency() error:', e)
        this.$refs.formMsg.danger(e.message)
      }
    }
  },
  watch: {
    groupSettings () {
      // re-fetch the latest correct values whenever the user switches groups
      this.refreshForm()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-label-container {
  display: flex;
  align-items: flex-end;
  column-gap: 0.5rem;

  .c-coming-soon {
    color: $text_1;
    margin-bottom: 0.5rem;
    user-select: none;

    i {
      margin-right: 0.2rem;
    }
  }
}

.c-helper {
  margin-top: 0;
  margin-bottom: 2rem;
}

.c-currency {
  @include tablet {
    width: 50%;
  }
}
</style>
