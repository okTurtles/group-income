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
          <li>
            <div v-for="contribution in receiving"
              class="box is-compact has-controls c-contribution"
              :class="{ 'is-editable': isMonetary(contribution.type) }"
            >
              <p class="box-body">
                <strong v-if="isMonetary(contribution.type)">{{currency}}{{contribution.what}} <i18n>for mincome</i18n></strong>
                <strong v-else>{{contribution.what}}</strong>
                <i18n>from</i18n>
                {{getWho(contribution.who)}}
                <template v-if="hasWhoElse(contribution.who)">
                  <i18n>and</i18n>
                  <button class="gi-is-unstyled is-link" @click="showHowElse">{{contribution.who.length - 1}} <i18n>others</i18n></button>
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
            </div>
          </li>
        </ul>
      </section>

      <section class="column">
        <i18n tag="h2" class="title is-3">Giving</i18n>

        <list v-if="givesNonMonetary || givesMonetary">
          <template v-for="contribution in giving.nonMonetary">
            <list-item variant="solid" v-if="true">
              <strong>{{contribution}}</strong>
              <button slot="actions"
                class="button is-icon"
                aria-label="[Edit NonMonetary contribution]"
                @click="editNonMonetary"
              >
                <i class="fa fa-edit"></i>
              </button>
            </list-item>
            <list-item variant="solid" v-if="isEditing(contribution)">
              <div class="field has-addons c-form" v-if="isCreatingNonMonetaryMethod">
                <p class="control is-expanded">
                  <input ref="newNonMonetaryValue" class="input" type="text" placeholder="Ex: Portuguese classes">
                </p>
                <p class="control">
                  <button class="button" @click="createNonMonetaryMethod">Add</button>
                </p>
              </div>
            </list-item>
          </template>

          <list-item variant="solid" v-if="givesMonetary">
            <strong>{{currency}}{{giving.monetary}}</strong> <i18n>to other's mincome</i18n>

            <button slot="actions"
              class="button is-icon"
              aria-label="[Edit Giving mincome settings]"
              @click="showGivingMincomeSettings"
            >
              <i class="fa fa-edit"></i>
            </button>
          </list-item>
        </list>

        <list>
          <list-item
            icon="heart"
            tag="button"
            variant="unfilled"
            v-if="!isCreatingNonMonetaryMethod"
            @click="addNoMonetaryMethod"
          >
            <i18n>Add a non-monetary method</i18n>
          </list-item>

          <list-item variant="unfilled" tag="button" v-if="!givesMonetary" icon="money">
            <i18n>Add a monetary method</i18n>
          </list-item>
        </list>
      </section>
    </div>
  </main>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";

.c-contribution {
  border: none;
  background-color: $white-ter;

  &.is-editable {
    background-color: $primary-bg-a;
  }
}

.c-form {
  height: 44px; // contribution list height - hardcoded

  .input,
  .button {
    height: 100%;
  }
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
