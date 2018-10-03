<template>
  <main>
    <div class="section is-hero level">
      <div>
        <i18n tag="h1" class="title is-1 is-marginless">
          Contributions
        </i18n>
        <i18n tag="p">See everyone’s contributions to the group and manage yours.</i18n>
      </div>
      <div>
        <groups-min-income :group="currentGroupState" />
      </div>
    </div>

    <section class="section columns is-desktop is-multiline c-grid">
      <div class="column">
        <i18n tag="h2" class="title is-3">Receiving</i18n>

        <ul class="c-ul">
          <contribution v-for="contribution in receiving.nonMonetary">
            <span v-html="textReceivingNonMonetary(contribution)"></span>
            <TextWho :who="contribution.who"></TextWho>
          </contribution>

          <trigger @animate="updateSize">
            <contribution v-if="doesReceiveMonetary" variant="editable" isMonetary @interaction="handleFormTriggerClick">
              <span v-html="textReceivingMonetary(receiving.monetary)"></span>
              <TextWho :who="groupMembersPledging"></TextWho>
              <i18n>each month</i18n>
            </contribution>
          </trigger>
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

          <trigger @animate="updateSize">
            <contribution v-if="doesGiveMonetary" variant="editable" isMonetary @interaction="handleFormTriggerClick">
              <!-- REVIEW - have different text if the user is pledging $0 -->
              <i18n class="has-text-weight-bold" :args="{amount:`${currency}${giving.monetary}`}">Pledge up to {amount}</i18n><i18n>to other's mincome</i18n>
            </contribution>
          </trigger>
        </ul>
      </div>
    </section>

    <trigger @animate="updateSize">
      <message-missing-income class="section"
        v-if="isFirstTime && !isEditingIncome"
        @click="handleFormTriggerClick"
      ></message-missing-income>
    </trigger>

    <target :targetCard="$refs.incomeForm" @animate="updateSize">
      <income-form ref="incomeForm" class="c-incomeForm"
        v-if="isEditingIncome"
        @save="handleIncomeSave"
        @cancel="handleIncomeCancel"
      ></income-form>
    </target>

    <masker :isActive="isEditingIncome" :elementsSize="maskerElementsSize"></masker>
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

    &:nth-child(2) {
      padding-right: 0;
    }
  }
}

.c-ul {
  margin: $gi-spacer*0.75 0;
}

.c-incomeForm {
  // - REVIEW needed on MaskToModal,
  // but dunno how to make it without being here...
  // - TODO review trigger elements too.
  // this fixes a bug on safari with a flickering first frame when entering.
  opacity: 0;
}
</style>
<script>
import { mapGetters } from 'vuex'
import currencies from './utils/currencies.js'
import MessageMissingIncome from './containers/contributions/MessageMissingIncome.vue'
import IncomeForm from './containers/contributions/IncomeForm.vue'
import GroupsMinIncome from './components/GroupsMinIncome.vue'
import Contribution from './components/Contribution.vue'
import TextWho from './components/TextWho.vue'
import { Trigger, Target, Masker } from './components/Transitions/MaskToModal/index.js'

export default {
  name: 'Contributions',
  components: {
    GroupsMinIncome,
    Contribution,
    TextWho,
    IncomeForm,
    MessageMissingIncome,
    Trigger,
    Target,
    Masker
  },
  data () {
    return {
      maskerElementsSize: {}, // a trigger or target
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
      ],
      timings: {
        move: 350,
        fade: 200
      }
    }
  },
  computed: {
    ...mapGetters([
      'currentGroupState'
    ]),
    doesReceiveMonetary () {
      return !!this.receiving.monetary && !this.isEditingIncome
    },
    doesGiveMonetary () {
      return !!this.giving.monetary && !this.isEditingIncome
    }
  },
  methods: {
    textReceivingNonMonetary (contribution) {
      return this.L('<strong>{what}</strong> from', { what: contribution.what })
    },
    textReceivingMonetary (contribution) {
      return this.L('<strong>Up to {amount} for mincome</strong> from', {
        amount: `${this.currency}${contribution}`
      })
    },

    submitAddNonMonetary (value) {
      console.log('TODO BE - submitAddNonMonetary')
      this.giving.nonMonetary.push(value) // Hardcoded Solution
    },
    handleEditNonMonetary (value, index) {
      if (!value) {
        console.log('TODO BE - deleteNonMonetary')
        this.giving.nonMonetary.splice(index, 1) // Hardcoded Solution
      } else {
        console.log('TODO BE - editNonMonetary')
        this.$set(this.giving.nonMonetary, index, value) // Hardcoded Solution
      }
    },
    handleFormTriggerClick () {
      this.isEditingIncome = true
    },
    handleIncomeSave ({ makeIncome, amount }) {
      console.log('TODO BE - Save Income Details')
      // -- Hardcoded Solution
      this.receiving.monetary = makeIncome ? null : this.mincome - amount
      this.giving.monetary = makeIncome ? amount : null
      this.isFirstTime = false

      this.closeIncome()
    },
    handleIncomeCancel () {
      this.closeIncome()
    },
    closeIncome () {
      this.isEditingIncome = false
    },

    // REVIEW - how can we pass the element sizes from trigger/target to masker
    // without using the parent that contains them?
    // maybe using provide / inject pattern?
    updateSize ({ name, size }) {
      this.maskerElementsSize[name] = size
    }
  }
}
</script>
