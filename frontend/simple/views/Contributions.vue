<template>
  <main>
    <div class="section is-hero">
      <i18n tag="h1" class="title is-1 is-marginless">
        Contributions
      </i18n>
      <i18n tag="p">See everyone’s contributions to the group and manage yours.</i18n>
    </div>

    <div class="section columns is-desktop is-multiline">
      <section class="column">
        <i18n tag="h2" class="title is-3">Receiving</i18n>

        <ul>
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
                <button class="gi-is-unstyled gi-is-link-inherit" @click="showHowElse">{{contribution.who.length - 1}} <i18n>others</i18n></button>
              </template>
            </p>
            <div class="box-controls">
              <button v-if="isMonetary(contribution.type)"
                slot="actions"
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

        <ul v-if="givesNonMonetary || givesMonetary">
          <li v-for="contribution in giving.nonMonetary">
            <template v-if="givesNonMonetary">
              <div class="box is-compact has-controls is-editable c-contribution"
                v-if="true"
              >
                <p class="box-body has-text-weight-bold">{{contribution}}</p>
                <div class="box-controls">
                  <button slot="actions"
                    class="button is-icon"
                    aria-label="[Edit NonMonetary contribution]"
                    @click="editNonMonetary"
                  >
                    <i class="fa fa-edit"></i>
                  </button>
                </div>
              </div>

              <div v-else class="box is-compact">
                <div class="field has-addons c-form">
                  <p class="control is-expanded">
                    <input ref="newNonMonetaryValue" class="input" type="text" placeholder="Ex: Portuguese classes">
                  </p>
                  <p class="control">
                    <button class="button" @click="createNonMonetaryMethod">Add</button>
                  </p>
                </div>
              </div>
            </template>

            <div v-if="givesMonetary" class="box is-compact has-controls is-editable c-contribution">
              <p class="box-body has-text-weight-bold">
                <strong>{{currency}}{{giving.monetary}}</strong> <i18n>to other's mincome</i18n>
              </p>
              <div class="box-controls">
                <button slot="actions"
                  class="button is-icon"
                  aria-label="[Edit Giving mincome settings]"
                  @click="showGivingMincomeSettings"
                >
                  <i class="fa fa-edit"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <ul>
          <li v-if="!isCreatingNonMonetaryMethod">
            <button class="box is-compact is-unfilled is-size-6 c-contribution" @click="addNoMonetaryMethod">
              <i class="fa fa-heart c-contribution-icon"></i>
              <i18n>Add a non-monetary method</i18n>
            </button>
          </li>

          <li v-else class="field has-addons gi-has-addons c-form">
            <input ref="newNonMonetaryValue" class="input" type="text" placeholder="Ex: Portuguese classes">
            <button class="button" @click="createNonMonetaryMethod">Add</button>
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

.c-form {
  height: 45px; // contribution list height - hardcoded
}
</style>
<script>
import { symbol } from './utils/currencies.js'
import { List, ListItem } from './components/Lists'

export default {
  name: 'Contributions',
  components: {
    List,
    ListItem
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
      isCreatingNonMonetaryMethod: false
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
    isMonetary (type) {
      return type === 'monetary'
    },
    getWho (who) {
      if (Array.isArray(who)) {
        return who.length > 3 ? who[0] : `${who[0]} and ${who[1]}`
      }

      return who
    },
    hasWhoElse (who) {
      return Array.isArray(who) && who.length > 3
    },
    showHowElse (contribution) {
      console.log('TODO - Show Who else')
    },
    showReceivingSettings () {
      console.log('TODO - Show Receiving Mincome Settings')
    },
    showGivingSettings () {
      console.log('TODO - Show Giving Mincome Settings')
    },
    editNonMonetary (contribution) {
      console.log('TODO - Edit NonMonetary Item')
    },
    addNoMonetaryMethod () {
      this.isCreatingNonMonetaryMethod = true
    },
    addMonetaryMethod () {
      console.log('TODO - Show Monetary Settings')
    },
    createNonMonetaryMethod () {
      console.log('TODO - createNonMonetaryMethod')
      if (!this.$refs.newNonMonetaryValue.value) {
        console.warn('Write something!')
      } else {
        this.giving.nonMonetary.push(this.$refs.newNonMonetaryValue.value)
        this.isCreatingNonMonetaryMethod = false
      }
    }
  }
}
</script>
