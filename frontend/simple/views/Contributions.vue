<template>
  <main>
    <div class="section is-hero">
      <i18n tag="h1" class="title is-1 is-marginless">
        Contributions
      </i18n>
      <i18n tag="p">See everyone’s contributions to the group and manage yours.</i18n>
    </div>

    <div class="section columns is-desktop is-multiline c-grid">
      <section class="column">
        <i18n tag="h2" class="title is-3">Receiving</i18n>

        <!-- TODO: Think about isolating <contribution/> and <input /> -->
        <ul class="c-ul">
          <li v-for="contribution in receiving"
            class="box is-compact has-controls c-contribution is-readonly"
            :class="{ 'is-editable': isMonetary(contribution.type) }"
          >
            <p class="box-body">
              <strong v-if="isMonetary(contribution.type)">{{currency}}{{contribution.what}} <i18n>for mincome</i18n></strong>
              <strong v-else>{{contribution.what}}</strong>
              <i18n>from</i18n>
              {{getWho(contribution.who)}}
              <template v-if="hasWhoElse(contribution.who)">
                <i18n>and</i18n>
                <tooltip>
                  <button class="gi-is-unstyled gi-is-link-inherit">{{contribution.who.length - 1}} <i18n>others</i18n></button>
                  <template slot="tooltip">
                    <p v-for="name, index in contribution.who" v-if="index > 1">{{name}}</p>
                  </template>
                </tooltip>
              </template>
            </p>
            <div class="box-controls">
              <button v-if="isMonetary(contribution.type)"
                class="button is-icon"
                aria-label="[Edit Receiving mincome settings]"
                @click="showReceivingSettings"
              >
                <i class="fa fa-edit"></i>
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="column">
        <i18n tag="h2" class="title is-3">Giving</i18n>

        <ul class="c-ul" v-if="givesNonMonetary || givesMonetary">
          <template v-for="contribution, index in giving.nonMonetary">
            <template v-if="givesNonMonetary">
              <li v-if="editingNonMonetaryIndex === index" class="field has-addons gi-has-addons c-form">
                <input ref="inputEditNonMonetary"
                  class="input"
                  type="text"
                  placeholder="Ex: Portuguese classes"
                  maxlength="20"
                  v-focus="contribution"
                  @keyup="verifySave"
                  @keyup.esc="cancelNonMonetary"
                  @keyup.enter="isFilled ? submitEditNonMonetary(index) : deleteEditNonMonetary(index)"
                >
                <button class="button" @click="cancelNonMonetary">Cancel</button>
                <button class="button has-text-primary" v-if="isFilled" @click="submitEditNonMonetary(index)">Save</button>
                <button class="button has-text-primary" v-else @click="deleteEditNonMonetary(index)">Delete</button>
              </li>

              <li v-else class="box is-compact has-controls is-editable c-contribution">
                <p class="box-body has-text-weight-bold">{{contribution}}</p>
                <div class="box-controls">
                  <button class="button is-icon" :aria-label="`Edit ${giving.monetary}`" @click="startEditNonMonetary(index)">
                    <i class="fa fa-edit"></i>
                  </button>
                </div>
              </li>
            </template>

            <li v-else-if="givesMonetary" class="box is-compact has-controls is-editable c-contribution">
              <p class="box-body has-text-weight-bold">
                <strong>{{currency}}{{giving.monetary}}</strong> <i18n>to other's mincome</i18n>
              </p>
              <div class="box-controls">
                <button class="button is-icon" :aria-label="`Edit ${giving.monetary}`" @click="showGivingMincomeSettings">
                  <i class="fa fa-edit"></i>
                </button>
              </div>
            </li>
          </template>
        </ul>

        <ul class="c-ul">
          <li v-if="!isCreatingNonMonetary">
            <button class="box is-compact is-unfilled is-size-6 c-contribution" @click="startAddNonMonetary">
              <i class="fa fa-heart c-contribution-icon"></i>
              <i18n>Add a non-monetary method</i18n>
            </button>
          </li>

          <li v-else class="field has-addons gi-has-addons c-form">
            <input ref="inputNewNonMonetary"
              class="input"
              type="text"
              placeholder="Ex: Portuguese classes"
              maxlength="20"
              v-focus
              @keyup="verifySave"
              @keyup.esc="cancelNonMonetary"
              @keyup.enter="submitAddNonMonetary"
            >
            <button class="button" @click="cancelNonMonetary">Cancel</button>
            <button class="button has-text-primary" v-if="isFilled" @click="submitAddNonMonetary">Add</button>
          </li>

          <li v-if="!givesMonetary">
            <button class="box is-compact is-unfilled is-size-6 c-contribution" @click="addMonetaryMethod">
              <i class="fa fa-money c-contribution-icon"></i>
              <i18n>Add a monetary method</i18n>
            </button>
          </li>
        </ul>
      </section>
    </div>
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

.c-contribution,
.c-form {
  min-height: 45px;
}

.c-contribution {
  width: 100%;

  &.is-readonly {
    border: none;
    background-color: $white-ter;
  }

  &.is-editable {
    border: none;
    background-color: $primary-bg-a;
  }

  &.is-unfilled {
    cursor: pointer;
    text-align: left;

    &:hover,
    &:focus {
      background-color: $primary-bg-a;
    }
  }

  &-icon {
    color: $primary;
    margin-right: $gi-spacer-sm;
  }
}

</style>
<script>
import { symbol } from './utils/currencies.js'
import Tooltip from './components/Tooltip.vue'

export default {
  name: 'Contributions',
  components: {
    Tooltip
  },
  data () {
    return {
      currency: symbol('USD'),
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
        },
        {
          type: 'monetary',
          what: 500,
          who: [
            'Jack Fisher',
            'Charlotte Doherty',
            'Thomas Baker',
            'Francisco Scott'
          ]
        }
      ],
      giving: {
        nonMonetary: [], // ArrayOf(String)
        monetary: null // Number
      },
      isFilled: null,
      isCreatingNonMonetary: false,
      editingNonMonetaryIndex: null
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
    getWho (who) {
      if (!Array.isArray(who)) {
        return who
      }

      return who.length > 3 ? who[0] : `${who[0]} and ${who[1]}`
    },
    hasWhoElse (who) {
      return Array.isArray(who) && who.length > 3
    },
    showGivingMincomeSettings () {
      console.log('TODO UI - Show Giving Mincome Setting')
    },
    showReceivingSettings () {
      console.log('TODO UI - Show Receiving Setting')
    },

    // Giving NonMonetary Methods:
    startAddNonMonetary () {
      this.cancelNonMonetary()
      this.isFilled = false
      this.isCreatingNonMonetary = true
    },
    startEditNonMonetary (contributionIndex) {
      this.cancelNonMonetary()
      this.isFilled = true
      this.editingNonMonetaryIndex = contributionIndex
    },
    cancelNonMonetary () {
      this.isCreatingNonMonetary = false
      this.editingNonMonetaryIndex = null
    },
    submitAddNonMonetary () {
      console.log('TODO BE - submitAddNonMonetary')
      this.giving.nonMonetary.push(this.$refs.inputNewNonMonetary.value)
      this.cancelNonMonetary()
    },
    submitEditNonMonetary (index) {
      console.log('TODO BE - submitEditNonMonetary')
      this.giving.nonMonetary[index] = this.$refs.inputEditNonMonetary[0].value
      this.cancelNonMonetary()
    },
    deleteEditNonMonetary (index) {
      console.log('TODO BE - deleteEditNonMonetary')
      this.giving.nonMonetary.splice(index, 1)
      this.cancelNonMonetary()
    },

    // Giving Monetary Methods:
    addMonetaryMethod () {
      console.log('TODO UI & BE - Show Monetary Settings')
    },
    verifySave (event) {
      this.isFilled = !!event.target.value
    }
  },
  directives: {
    focus: {
      inserted (el, binding) {
        if (binding.value) { el.value = binding.value } // set "contribution" as default.value
        el.focus()
      }
    }
  }
}
</script>
