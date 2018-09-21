<template>
  <main>
    <div class="section is-hero">
      <i18n tag="h1" class="title is-1 is-marginless">
        Contributions
      </i18n>
      <i18n tag="p">See everyone’s contributions to the group and manage yours.</i18n>
    </div>

    <section class="section columns is-desktop is-multiline c-grid">
      <div class="column">
        <i18n tag="h2" class="title is-3">Receiving</i18n>

        <ul class="c-ul">
          <contribution
            v-for="contribution, index in receiving"
            :variant="isMonetary(contribution.type) ? 'editable' : undefined"
            :isMonetary="isMonetary(contribution.type)"
            @interaction="showMonetaryReceiving"
          >
            <span v-html="textReceivingContribution(contribution, index)"></span>
            <TextWho :who="contribution.who"></TextWho>
          </contribution>
        </ul>
      </div>

      <div class="column">
        <i18n tag="h2" class="title is-3">Giving</i18n>

        <ul class="c-ul" v-if="givesNonMonetary || givesMonetary">
          <contribution v-for="contribution, index in giving.nonMonetary"
            class="has-text-weight-bold"
            variant="editable"
            @new-value="(value) => handleEditNonMonetary(value, index)"
          >{{contribution}}</contribution>

          <contribution v-if="givesMonetary"
            variant="editable"
            isMonetary
            @interaction="showGivingMincomeSettings"
          >
            <span class="has-text-weight-bold">{{currency}}{{giving.monetary}}</span> <i18n>to other's mincome</i18n>
          </contribution>
        </ul>

        <ul class="c-ul">
          <contribution variant="unfilled" @new-value="submitAddNonMonetary">
            <i class="fa fa-heart c-contribution-icon" aria-hidden="true"></i>
            <i18n>Add a non-monetary method</i18n>
          </contribution>
          <!--
          <contribution v-if="!givesMonetary" variant="unfilled" isMonetary @interaction="showMonetaryGiving">
            <i class="fa fa-money c-contribution-icon" aria-hidden="true"></i>
            <i18n>Add a monetary method</i18n>
          </contribution> -->
        </ul>
      </div>
    </section>

    <section class="section">
      <income-form></income-form>
    </section>
  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-grid .column {
  @include touch {
    padding-left: 0;
    padding-right: 0;
  }

  @include desktop {
    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
    }
  }
}

.c-ul {
  margin: $gi-spacer*0.75 0;
}
</style>
<script>
import currencies from './utils/currencies.js'
import Contribution from './components/Contribution.vue'
import TextWho from './components/TextWho.vue'
import IncomeForm from './containers/contributions/IncomeForm.vue'

export default {
  name: 'Contributions',
  components: {
    Contribution,
    TextWho,
    IncomeForm
  },
  data () {
    return {
      currency: currencies['USD'],
      receiving: [
        {
          type: 'no-monetary',
          what: 'Cooking',
          who: 'Lilia Bouvet'
        },
        {
          type: 'no-monetary',
          what: 'Cuteness',
          who: ['Zoe Kim', 'Laurence E']
        }
        // {
        //   type: 'monetary',
        //   what: 500,
        //   who: [
        //     'Jack Fisher',
        //     'Charlotte Doherty',
        //     'Thomas Baker',
        //     'Francisco Scott'
        //   ]
        // }
      ],
      giving: {
        nonMonetary: [], // ArrayOf(String)
        monetary: null // Number
      }
    }
  },
  computed: {
    givesMonetary () {
      return !!this.giving.monetary
    },
    givesNonMonetary () {
      return this.giving.nonMonetary.length > 0
    }
  },
  methods: {
    // Receiving
    isMonetary (type) {
      return type === 'monetary'
    },
    textReceivingContribution (contribution) {
      if (this.isMonetary(contribution.type)) {
        return this.L('<strong>Up to {what} for mincome</strong> from', {
          what: `${this.currency}${contribution.what}`
        })
      } else {
        return this.L('<strong>{what}</strong> from', { what: contribution.what })
      }
    },
    showGivingMincomeSettings () {
      console.log('TODO UI - Show Giving Mincome Setting - next PR')
    },
    showMonetaryReceiving () {
      // sbp('okTurtles.events/emit', OPEN_MODAL, MonetaryReceiving)
    },

    // Giving
    submitAddNonMonetary (value) {
      console.log('TODO BE - submitAddNonMonetary')
      this.giving.nonMonetary.push(value)
    },
    handleEditNonMonetary (value, index) {
      if (!value) {
        console.log('TODO BE - deleteNonMonetary')
        this.giving.nonMonetary.splice(index, 1)
      } else {
        console.log('TODO BE - editNonMonetary')
        // https://vuejs.org/v2/guide/list.html#Caveats
        this.$set(this.giving.nonMonetary, index, value)
      }
    },
    showMonetaryGiving () {
      // sbp('okTurtles.events/emit', OPEN_MODAL, MonetaryGiving)
    }
  }
}
</script>
