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

          <transition @before-enter="transContrBefEnter" @enter="transContrEnter" @leave="transContrLeave">
            <contribution ref="contPledged" v-if="doesGiveMonetary" variant="editable" isMonetary @interaction="editIncomeDetails"
            :class="{ 'isEditing': this.isEditingIncome }">
              <!-- REVIEW - have different text if the user is pledging $0 -->
              <i18n class="has-text-weight-bold" :args="{amount:`${currency}${giving.monetary}`}">Pledge up to {amount}</i18n><i18n>to other's mincome</i18n>
            </contribution>
          </transition>
        </ul>
      </div>
      <transition @before-enter="transTriggerBefEnter" @enter="transTriggerEnter" @leave="transTriggerLeave">
        <message-missing-income ref="messageIncome" v-if="isFirstTime && !isEditingIncome" @click="handleMessageClick"></message-missing-income>
      </transition>
    </section>

    <income-form ref="incomeForm"
      :isEditing="isEditingIncome"
      :transBefEnter="transFormBefEnter"
      :transEnter="transFormEnter"
      :transLeave="transFormLeave"
      @save="handleIncomeSave"
      @cancel="handleIncomeCancel"
    ></income-form>

    <!-- TODO - isolar mask logic as much as possible. -->
    <transition @appear="transMaskAppear" @before-enter="transMaskBefEnter" @enter="transMaskEnter" @before-leave="transMaskBefLeave" @leave="transMaskLeave" @after-leave="transMaskAfterLeave">
      <div v-if="!isEditingIncome" class="c-mask">MASK</div>
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

    &:last-child {
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
  background: $primary-bg-s;
  border: 1px solid $primary;
  border-radius: $radius;
  z-index: 50;
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
      elIncomeForm: {},
      elFormTrigger: {}, // a contribution or missing message
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
    handleMessageClick () {
      console.log('handleMessageClick')
      const { width, height, top, left } = this.$refs.messageIncome.$el.getBoundingClientRect()

      this.elFormTrigger = { offsetWidth: width, offsetHeight: height, offsetTop: top, offsetLeft: left }

      this.isEditingIncome = true
    },
    editIncomeDetails () {
      console.log('editIncomeDetails')
      const { width, height, top, left } = this.$refs.contPledged.$el.getBoundingClientRect()

      this.elFormTrigger = { offsetWidth: width, offsetHeight: height, offsetTop: top, offsetLeft: left }

      this.isEditingIncome = true
    },
    handleIncomeSave ({ makeIncome, amount }) {
      console.log('TODO BE - Save Income Details')
      // Hardcoded Solution
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
      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.$refs.incomeForm.$refs.card
      this.elIncomeForm = { offsetWidth, offsetHeight, offsetTop, offsetLeft }
      this.isEditingIncome = false
    },

    // IncomeForm to Contribution Animations:

    transContrBefEnter (el) {
      el.style.opacity = 0.2
    },
    transContrEnter (el, complete) {
      Velocity(el, { opacity: 1 }, { duration: 300, delay: 300, complete })
    },
    transContrLeave (el, complete) {
      Velocity(el, { opacity: 0.2 }, { duration: 300, complete })
    },

    transTriggerBefEnter (el) {
      el.style.opacity = 0
    },
    transTriggerEnter (el, complete) {
      Velocity(el, 'fadeIn', { duration: 200, delay: 350, display: '', complete })
    },
    transTriggerLeave (el, complete) {
      Velocity(el, 'fadeOut', { duration: 200, display: '', complete })
    },

    transFormBefEnter (el) {
      el.style.opacity = 0
      this.$refs.incomeForm.$refs.card.style.opacity = 0
    },
    transFormEnter (el, complete) {
      Velocity(el, 'fadeIn', { duration: 150, delay: 150, display: '' })
      Velocity(this.$refs.incomeForm.$refs.card, 'fadeIn', { duration: 150, delay: 350, complete })
    },
    transFormLeave (el, complete) {
      Velocity(this.$refs.incomeForm.$refs.card, { opacity: 0 }, { duration: 50 })
      Velocity(el, 'fadeOut', { duration: 150, delay: 250, display: '', complete })
    },

    transMaskAppear (el, complete) {
      console.log('transMaskAppear')
      if (this.isFirstTime) {
        const { width, height, top, left } = this.$refs.messageIncome.$el.getBoundingClientRect()

        Velocity(el, { opacity: 0.2, width, height, top, left }, { duration: 1, complete })
      } else {
        // TODO - adapt to contribution: receiving or pledging.
      }
    },

    // to contr/message
    transMaskBefEnter (el) {
      console.log('transMaskBefEnter')
    },
    transMaskEnter (el, done) {
      console.log('transMaskEnter')
      Velocity(el, { opacity: 0.2, width: this.elIncomeForm.offsetWidth, height: this.elIncomeForm.offsetHeight, top: this.elIncomeForm.offsetTop, left: this.elIncomeForm.offsetLeft }, { duration: 1 })

      console.log('wual é o elemento agora paah')
      if (!this.isFirstTime) {
        // TODO verify when it's receiving contr. - is this the correct place?
        const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.$refs.contPledged.$el
        this.elFormTrigger = { offsetWidth, offsetHeight, offsetTop, offsetLeft }
      }

      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.elFormTrigger

      Velocity(el, { opacity: 1 }, { duration: 50 })
      Velocity(el, { width: offsetWidth, height: offsetHeight, top: offsetTop, left: offsetLeft },
        { duration: 250, delay: 50, easing: 'ease-out' }
      )
      Velocity(el, { opacity: 0.2 }, { duration: 150, complete: done })
    },

    // to form
    transMaskBefLeave (el) {
      console.log('transMaskBefLeave')
    },
    transMaskLeave (el, complete) {
      console.log('transMaskLeave')

      Velocity(el, { opacity: 0.2, width: this.elFormTrigger.offsetWidth, height: this.elFormTrigger.offsetHeight, top: this.elFormTrigger.offsetTop, left: this.elFormTrigger.offsetLeft }, { duration: 1 })

      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.elIncomeForm.offsetWidth ? this.elIncomeForm : this.$refs.incomeForm.$refs.card
      Velocity(el, { opacity: 1 }, { duration: 150 })
      Velocity(el, { width: offsetWidth, height: offsetHeight, top: offsetTop, left: offsetLeft },
        { duration: 250, easing: 'ease-out' }
      )
      Velocity(el, { opacity: 0.2 }, { duration: 150, complete })
    },
    transMaskAfterLeave () {
    }
  }
}
</script>
