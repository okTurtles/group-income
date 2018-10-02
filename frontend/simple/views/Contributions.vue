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

          <transition @enter="transTriggerEnter" @leave="transTriggerLeave">
            <contribution ref="contReceiving" v-if="doesReceiveMonetary" variant="editable" isMonetary @interaction="handleFormTriggerClick">
              <span v-html="textReceivingMonetary(receiving.monetary)"></span>
              <TextWho :who="groupMembersPledging"></TextWho>
              <i18n>each month</i18n>
            </contribution>
          </transition>
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

          <transition @enter="transTriggerEnter" @leave="transTriggerLeave">
            <contribution ref="triggerPledged" v-if="doesGiveMonetary" variant="editable" isMonetary @interaction="handleFormTriggerClick">
              <!-- REVIEW - have different text if the user is pledging $0 -->
              <i18n class="has-text-weight-bold" :args="{amount:`${currency}${giving.monetary}`}">Pledge up to {amount}</i18n><i18n>to other's mincome</i18n>
            </contribution>
          </transition>
        </ul>
      </div>
      <transition @enter="transTriggerEnter" @leave="transTriggerLeave">
        <message-missing-income ref="triggerMissing"
            class="column is-12"
            v-if="isFirstTime && !isEditingIncome"
            @click="handleFormTriggerClick"
        ></message-missing-income>
      </transition>
    </section>

    <income-form ref="incomeForm"
      :isEditing="isEditingIncome"
      :transEnter="transFormEnter"
      :transLeave="transFormLeave"
      @save="handleIncomeSave"
      @cancel="handleIncomeCancel"
    ></income-form>

    <!-- TODO - isolate mask logic as much as possible. -->
    <transition @enter="transMaskEnter" @leave="transMaskLeave">
      <div v-if="isEditingIncome" class="c-mask"></div>
    </transition>
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

    &:nth-child(2) {
      padding-right: 0;
    }
  }
}

.c-ul {
  margin: $gi-spacer*0.75 0;
}

.c-mask {
  pointer-events: none;
  position: fixed;
  opacity: 0.01;
  background: $primary-bg-s;
  border-radius: $radius;
  z-index: $gi-zindex-mask;
}
</style>
<script>
import Velocity from 'velocity-animate'
import currencies from './utils/currencies.js'
import Contribution from './components/Contribution.vue'
import TextWho from './components/TextWho.vue'
import MessageMissingIncome from './containers/contributions/MessageMissingIncome.vue'
import IncomeForm from './containers/contributions/IncomeForm.vue'
export default {
  name: 'Contributions',
  components: {
    Contribution,
    TextWho,
    IncomeForm,
    MessageMissingIncome
  },
  data () {
    return {
      triggerDimensions: null, // a contribution or missing message
      targetDimensions: null, // the income form
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
    textReceivingNonMonetary (contribution) {
      return this.L('<strong>{what}</strong> from', { what: contribution.what })
    },
    textReceivingMonetary (contribution) {
      return this.L('<strong>Up to {amount} for mincome</strong> from', {
        amount: `${this.currency}${contribution}`
      })
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
      console.log('closeIncome')
      this.isEditingIncome = false
    },

    // ---- IncomeForm Mask Animations:

    transTriggerEnter (el, complete) {
      console.log('transTriggerEnter')

      this.updateDimensions(el, 'triggerDimensions')

      Velocity(el, { opacity: 0 }, { duration: 0 })
      Velocity(el, { opacity: 1 }, { duration: 150, delay: 350, complete })
    },
    transTriggerLeave (el, complete) {
      console.log('transTriggerLeave')

      this.updateDimensions(el, 'triggerDimensions')

      Velocity(el, { opacity: 0 }, { duration: 150, complete })
    },

    transFormEnter (el, complete) {
      console.log('transFormEnter')
      const formInner = this.$refs.incomeForm.$refs.form
      Velocity(el, { opacity: 0 }, { duration: 0 })
      Velocity(formInner, { opacity: 0 }, { duration: 0 })

      this.updateDimensions(formInner, 'targetDimensions')

      Velocity(el, { opacity: 1 }, { duration: 150, delay: 150 })
      Velocity(formInner, 'fadeIn', { duration: 150, delay: 350, complete })
    },
    transFormLeave (el, complete) {
      console.log('transFormLeave')
      const formInner = this.$refs.incomeForm.$refs.form

      this.updateDimensions(formInner, 'targetDimensions')

      Velocity(formInner, { opacity: 0 }, { duration: 50 })
      Velocity(el, { opacity: 0 }, { duration: 150, delay: 250, complete })
    },

    // to form income
    transMaskEnter (el, complete) {
      console.log('transMaskLeave')

      Velocity(el, { opacity: 0.1, ...this.triggerDimensions }, { duration: 0 })

      Velocity(el, { opacity: 1 }, { duration: 150 })
      Velocity(el, { ...this.targetDimensions }, { duration: 250, easing: 'ease-out' })
      Velocity(el, { opacity: 0.01 }, { duration: 150, complete })
    },

    // to contribution / missing message
    transMaskLeave (el, complete) {
      console.log('transMaskEnter')
      Velocity(el, { opacity: 0.1, ...this.targetDimensions }, { duration: 0 })

      Velocity(el, { opacity: 1 }, { duration: 50 })
      Velocity(el, { ...this.triggerDimensions }, { duration: 250, delay: 50, easing: 'ease-out' })
      Velocity(el, { opacity: 0.01 }, { duration: 150, complete })
    },

    // animation UTILS:
    updateDimensions (el, objectKey) {
      const { width, height, top, left } = el.getBoundingClientRect()
      this[objectKey] = { width, height, top, left }
    }
  }
}
</script>
