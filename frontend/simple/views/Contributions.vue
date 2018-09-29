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
    </section>

    <section class="section">
      <income-form
        ref="incomeForm"
        :isFirstTime="isFirstTime"
        :isEditing="isEditingIncome"
        @save="handleIncomeSave"
        @cancel="handleIncomeCancel"
        :transBeforeEnter="transFormBefEnter"
        :transEnter="transFormEnter"
        :transLeave="transFormLeave"
      ></income-form>
    </section>

    <transition @appear="transMaskAppear" @before-enter="transMaskBefEnter" @enter="transMaskEnter" @before-leave="transMaskBefLeave" @leave="transMaskLeave" @after-leave="transMaskAfterLeave">
      <div v-if="isFirstTime || isEditingIncome" class="c-mask"></div>
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
  position: absolute;
  background: $primary-bg-s;
  border-radius: $radius;
}
</style>
<script>
import Velocity from 'velocity-animate'
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
      elIncomeForm: {},
      elContr: {},
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
      console.log('editIncomeDetails')
      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.$refs.contPledged.$el

      this.elContr = { offsetWidth, offsetHeight, offsetTop, offsetLeft }
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
      console.log('aqui')
      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.$refs.incomeForm.$el

      this.elIncomeForm = { offsetWidth, offsetHeight, offsetTop, offsetLeft }
      this.isEditingIncome = false
    },

    // IncomeForm to Contribution Animations:

    transContrBefEnter (el) {
      el.style.opacity = 0
      // TRICK: sheaper 'slideDown' effect by using negative marginBottom
      // when the element is not visible (has the mask above)
      el.style.marginBottom = `-${el.offsetHeight}px`
    },
    transContrEnter (el, complete) {
      Velocity(el, { opacity: 1, marginBottom: 8 }, { duration: 300, delay: 300, complete })
    },
    transContrLeave (el, complete) {
      Velocity(el, { opacity: 0 }, { duration: 300, complete })
    },

    transFormBefEnter (el) {
      el.style.opacity = 0
    },
    transFormEnter (el, done) {
      Velocity(el, { opacity: 1 }, { duration: 150, delay: 600, complete: done })
    },
    transFormLeave (el, done) {
      Velocity(el, { opacity: 0 }, { duration: 150 })
      Velocity(el, 'slideUp', { duration: 450, delay: 150, complete: done })
    },

    transMaskAppear (el, done) {
      console.log('transMaskAppear')
      Velocity(el, { opacity: 0, width: this.$refs.incomeForm.$el.offsetWidth, height: this.$refs.incomeForm.$el.offsetHeight, top: this.$refs.incomeForm.$el.offsetTop, left: this.$refs.incomeForm.$el.offsetLeft }, { duration: 1, complete: done })
    },
    // from contr to form
    transMaskBefEnter (el) {
      console.log('transMaskBefEnter')
    },
    transMaskEnter (el, done) {
      console.log('transMaskEnter')
      Velocity(el, { opacity: 0, width: this.elContr.offsetWidth, height: this.elContr.offsetHeight, top: this.elContr.offsetTop, left: this.elContr.offsetLeft }, { duration: 1 })

      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.elIncomeForm

      Velocity(el, { opacity: 1 }, { duration: 250 })
      Velocity(el, { width: offsetWidth, height: offsetHeight, top: offsetTop, left: offsetLeft }, { duration: 350, easing: 'ease-out' })
      Velocity(el, { opacity: 0 }, { duration: 250, complete: done })
    },

    // from form to contr
    transMaskBefLeave (el) {
      console.log('transMaskBefLeave')
    },
    transMaskLeave (el, done) {
      console.log('transMaskLeave')
      Velocity(el, { opacity: 0, width: this.elIncomeForm.offsetWidth, height: this.elIncomeForm.offsetHeight, top: this.elIncomeForm.offsetTop, left: this.elIncomeForm.offsetLeft }, { duration: 1 })

      const { offsetWidth, offsetHeight, offsetTop, offsetLeft } = this.elContr.offsetWidth ? this.elContr : this.$refs.contPledged.$el
      Velocity(el, { opacity: 1 }, { duration: 150 })
      Velocity(el, { width: offsetWidth, height: offsetHeight, top: offsetTop, left: offsetLeft }, { duration: 350, easing: 'ease-in' })
      Velocity(el, { opacity: 0 }, { duration: 150, complete: done })
    },
    transMaskAfterLeave () {
    }
  }
}
</script>
