<template lang="pug">
page-section(v-if='showHistory' :title='L("Support History")')
  i18n.support-history.button.is-outlined.is-small(
    tag='span'
    @click='toggleHistory'
  ) This month's overview
  support-history

page-section(v-else :title='L("This months overview")')
  i18n.support-history.button.is-outlined.is-small(
    tag='span'
    @click='toggleHistory'
  ) Support history
  overview
</template>

<script>
import Overview from '@components/Graphs/Overview.vue'
import SupportHistory from '@components/Graphs/SupportHistory.vue'
import PageSection from '@components/PageSection.vue'

export default {
  name: 'GroupDashboard',
  data () {
    return {
      showHistory: false
    }
  },
  components: {
    Overview,
    SupportHistory,
    PageSection
  },
  methods: {
    toggleHistory () {
      this.showHistory = !this.showHistory
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.card {
  position: relative;
}

.support-history {
  position: absolute;
  right: 2.5rem;
  top: 2.5rem;

  @include phone {
    display: none;
  }
}
</style>
