<template>
  <span>
    {{firstWho}}
    <template v-if="hasWhoElse">
      <i18n>and</i18n>
      <tooltip>
        <button type="button" class="gi-is-unstyled gi-is-link-inherit">{{notFirstWho.length}}<i18n>others</i18n></button>
        <template slot="tooltip">
          <p v-for="(name, index) in notFirstWho" :key="`name-${index}`">{{name}}</p>
        </template>
      </tooltip>
    </template>
  </span>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

</style>
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
      return who.slice(1)
    },
    hasWhoElse () {
      return Array.isArray(this.who) && this.who.length > 2
    }
  }
}
</script>
