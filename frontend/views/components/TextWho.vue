<template lang="pug">
span
  | {{firstWho}}
  template(v-if='hasWhoElse')
    i18n and
    tooltip
      button.is-unstyled.is-link-inherit(type='button')
        | {{notFirstWho.length}}
        i18n others
      template(slot='tooltip')
        p(v-for='(name, index) in notFirstWho' :key='`name-${index}`') {{name}}

</template>

<script>
import Tooltip from './Tooltip.vue'
export default {
  name: 'TextGroupHelpMincome',
  components: {
    Tooltip
  },
  props: {
    who: [String, Array]
  },
  computed: {
    firstWho () {
      const who = this.who

      if (!Array.isArray(who)) {
        return who
      }

      return who.length === 2 ? this.L('{who0} and {who1}', { who0: who[0], who1: who[1] }) : who[0]
    },
    notFirstWho () {
      return this.who.slice(1)
    },
    hasWhoElse () {
      return Array.isArray(this.who) && this.who.length > 2
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

</style>
