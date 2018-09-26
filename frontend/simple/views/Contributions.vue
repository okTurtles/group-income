<template>
  <main class="c-main">
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
          <contribution v-for="contribution in receiving.nonMonetary">
            <span v-html="textReceivingNonMonetary(contribution)"></span>
            <TextWho :who="contribution.who"></TextWho>
          </contribution>

          <contribution v-if="doesReceiveMonetary"
            variant="editable" isMonetary
            @interaction="editIncomeDetails"
          >
            <span v-html="textReceivingMonetary(receiving.monetary)"></span>
            <TextWho :who="groupMembersPledging"></TextWho>
            <i18n>each month</i18n>
          </contribution>
        </ul>
      </div>

      <div class="column">
        <i18n tag="h2" class="title is-3">Giving</i18n>

        <ul class="c-ul">
          <contribution v-for="contribution, index in giving.nonMonetary"
            class="has-text-weight-bold"
            variant="editable"
            @new-value="(value) => handleEditNonMonetary(value, index)"
          >{{contribution}}</contribution>

          <contribution variant="unfilled" @new-value="submitAddNonMonetary">
            <i class="fa fa-heart c-contribution-icon" aria-hidden="true"></i>
            <i18n>Add a non-monetary method</i18n>
          </contribution>

          <contribution v-if="doesGiveMonetary" variant="editable" isMonetary @interaction="editIncomeDetails">
            <!-- TODO - different text if is pledging $0 -->
            <i18n class="has-text-weight-bold" :args="{amount:`${currency}${giving.monetary}`}">Pledge up to {amount}</i18n><i18n>to other's mincome</i18n>
          </contribution>
        </ul>
      </div>
    </section>

    <section class="section">
      <income-form
        :isFirstTime="isFirstTime"
        :isEditing="isEditingIncome"
        @save="handleIncomeSave"
      ></income-form>
    </section>
  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-main {
  padding-bottom: 4rem;
}

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
      isEditingIncome: false,
      // -- Hardcoded Data just for layout purpose:
      currency: currencies['USD'],
      isFirstTime: true, // true when user doesn't have any income details. It displays the 'Add Income Details' box
      mincome: 500,
      receiving: {
        nonMonetary: [
          {
            what: 'Cooking',
            who: 'Lilia Bouvet'
          },
          {
            what: 'Cuteness',
            who: ['Zoe Kim', 'Laurence E']
          }
        ],
        monetary: null
      },
      giving: {
        nonMonetary: [], // ArrayOf(String)
        monetary: null // Number - Edit to see the giving monetary contribution box
      },
      groupMembersPledging: [
        'Jack Fisher',
        'Charlotte Doherty',
        'Thomas Baker',
        'Francisco Scott'
      ]
    }
  },
  computed: {
    doesReceiveMonetary () {
      return !!this.receiving.monetary && !this.isEditingIncome
    },
    doesGiveMonetary () {
      return !!this.giving.monetary && !this.isEditingIncome
    }
  },
  methods: {
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
        this.$set(this.giving.nonMonetary, index, value)
      }
    },
    textReceivingNonMonetary (contribution) {
      return this.L('<strong>{what}</strong> from', { what: contribution.what })
    },
    textReceivingMonetary (contribution) {
      return this.L('<strong>Up to {amount} for mincome</strong> from', {
        amount: `${this.currency}${contribution}`
      })
    },
    editIncomeDetails () {
      this.isEditingIncome = true
    },
    handleIncomeSave ({ makeIncome, amount }) {
      this.isEditingIncome = false
      this.isFirstTime = false
      console.log('TODO BE - Save Income Details')
      this.receiving.monetary = makeIncome ? null : this.mincome - amount
      this.giving.monetary = makeIncome ? amount : null
    }
  }
}
</script>
