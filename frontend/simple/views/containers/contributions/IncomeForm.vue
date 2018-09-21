<template>
  <div class="box is-unfilled c-reminder"
    role="button"
    v-if="!isFilling"
    @click="isFilling = true"
  >
    <div class="is-flex c-header">
      <i class="fa fa-plus is-flex c-header-icon"></i>
      <i18n tag="h2" class="title is-5">Add Income Details</i18n>
    </div>
    <i18n tag="p" class="c-info">{{info}}</i18n>
    <div class="has-text-danger">
      <i class="fa fa-exclamation-triangle"></i>
      <i18n tag="strong">This information is required for you to be able to be part of the group.</i18n>
    </div>
  </div>

  <form class="box c-form" v-else>
    <i18n tag="h2" class="title is-5 is-marginless">Income Details</i18n>
    <i18n tag="p" class="c-info">{{info}}</i18n>

    <hr>

    <div class="columns is-desktop is-multiline c-grid">
      <div class="column">
        <fieldset>
          <i18n tag="legend" class="sr-only">Income details</i18n>

          <div class="field c-form-field">
            <i18n tag="p" class="label">What's your monthly income?</i18n>
            <div class="field has-addons">
              <p class="control">
                <span class="button is-static">
                  {{groupCurrency}}
                </span>
              </p>
              <p class="control">
                <input ref="input" class="input" type="number" :value="value" :placeholder="L('amout')">
              </p>
            </div>
            <p class="c-textWho">
              <TextWho :who="['Rick', 'Carl', 'Kim']"></TextWho>
              <i18n>will ensure you meet the mincome</i18n>
            </p>
          </div>

          <!-- TODO - pretty custom radio buttons -->
          <div class="field is-narrow c-form-field">
            <i18n tag="p" class="label">Do you make at least {income} per month?</i18n>
            <div class="control">
              <label class="radio">
                <input type="radio" name="enoughMincome" value="no">
                No, I don't
              </label>
              <label class="radio">
                <input type="radio" name="enoughMincome" value="yes">
                Yes, I do
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <i18n tag="legend" class="sr-only">Payment method</i18n>

          <payment-methods></payment-methods>
        </fieldset>
      </div>
      <div class="column">
        [Graphs on the way]
      </div>
    </div>

    <div class="field is-grouped is-grouped-right">
      <p class="control">
        <i18n tag="button" class="button is-primary">Save income details</i18n>
      </p>
      <p class="control">
        <i18n tag="button" class="button"@click="isFilling = false">Cancel</i18n>
      </p>
    </div>
  </form>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-reminder {
  cursor: pointer;
  transition: background 100ms;

  // TODO: make this global to all unfilled boxes
  &:hover {
    border: 1px solid $primary;
    background: $primary-bg-a;
    box-shadow: 0 1px 1px $grey-lighter;
  }

  .c-info {
    margin: $gi-spacer 0;
  }
}

.c-header {
  align-items: center;

  &-icon {
    background: $primary-bg-a;
    width: 2rem;
    height: 2rem;
    margin-right: $gi-spacer-sm;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    color: $primary;
  }
}

.c-form {
  .c-info {
    margin: $gi-spacer-sm 0 $gi-spacer;
  }

  &-field {
    margin-bottom: $gi-spacer*1.5;
  }
}

.c-textWho {
  margin-top: -$gi-spacer-sm;
}

</style>
<script>
import PaymentMethods from './PaymentMethods.vue'
import TextWho from '../../components/TextWho.vue'

export default {
  name: 'IncomeForm',
  components: {
    PaymentMethods,
    TextWho
  },
  props: {
  },
  data () {
    return {
      isFilling: true
    }
  },
  computed: {
    info () {
      return this.L('A clear text explaining why this information is needed, so the user understands and feels comfortable about providing this information.')
    },
    groupCurrency () {
      return '$ USD'
    }
  }
}
</script>
