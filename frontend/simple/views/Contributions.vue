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

        <ul class="c-ul">
          <contribution
            v-for="contribution, index in receiving"
            :variant="isMonetary(contribution.type) ? 'editable' : undefined"
            v-on="isMonetary(contribution.type) ? { 'control-click': showReceivingSettings } : {}"
          >
            <i18n tag="strong"v-if="isMonetary(contribution.type)"
              :args="{ currency, amount: receiving[index].what}"
            >{currency}{amount} for mincome</i18n>
            <strong v-else>{{contribution.what}}</strong>
            <i18n>from</i18n>
            {{getWho(contribution.who)}}
            <template v-if="hasWhoElse(contribution.who)">
              <i18n>and</i18n>
              <tooltip>
                <button class="gi-is-unstyled gi-is-link-inherit">{{contribution.who.length - 1}}<i18n>others</i18n></button>
                <template slot="tooltip">
                  <p v-for="name, index in contribution.who" v-if="index > 0">{{name}}</p>
                </template>
              </tooltip>
            </template>
          </contribution>
        </ul>
      </section>

      <section class="column">
        <i18n tag="h2" class="title is-3">Giving</i18n>

        <ul class="c-ul" v-if="givesNonMonetary || givesMonetary">
          <contribution v-for="contribution, index in giving.nonMonetary"
            class="has-text-weight-bold"
            variant="editable"
            @new-value="(value) => handleEditNonMonetary(value, index)"
          >{{contribution}}</contribution>

          <contribution v-if="givesMonetary"
            variant="editable"
            @control-click="showGivingMincomeSettings"
          >
            <span class="has-text-weight-bold">{{currency}}{{giving.monetary}}</span> <i18n>to other's mincome</i18n>
          </contribution>
        </ul>

        <ul class="c-ul">
          <contribution variant="unfilled" @new-value="submitAddNonMonetary">
            <i class="fa fa-heart c-contribution-icon" aria-hidden="true"></i>
            <i18n>Add a non-monetary method</i18n>
          </contribution>

          <contribution v-if="!givesMonetary" variant="unfilled" @control-click="addMonetaryMethod">
            <i class="fa fa-money c-contribution-icon" aria-hidden="true"></i>
            <i18n>Add a monetary method</i18n>
          </contribution>
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
</style>
<script>
import { symbol } from './utils/currencies.js'
import Contribution from './components/Contribution.vue'
import Tooltip from './components/Tooltip.vue'

export default {
  name: 'Contributions',
  components: {
    Contribution,
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
      console.log('TODO UI - Show Giving Mincome Setting - next PR')
    },
    showReceivingSettings () {
      console.log('TODO UI - Show Receiving Setting - next PR')
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

    // Giving Monetary Methods:
    addMonetaryMethod () {
      console.log('TODO UI - Show Monetary Settings Modal - next PR')
    }
  }
}
</script>
