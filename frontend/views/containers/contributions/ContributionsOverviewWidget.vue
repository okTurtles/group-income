<template lang="pug">
page-section(v-if='showHistory' :title='L("Support History")')
  i18n.support-history.button.is-outlined.is-small(
    tag='span'
    @click='toggleHistory'
  ) This period's overview
  support-history

page-section(v-else :title='L("This period overview")')
  i18n.support-history.button.is-outlined.is-small(
    tag='span'
    @click='toggleHistory'
  ) Support history
  overview
</template>

<script>
import Overview from '@components/graphs/Overview.vue'
import SupportHistory from '@components/graphs/SupportHistory.vue'
import PageSection from '@components/PageSection.vue'

export default ({
  name: 'ContributionsOverview',
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
}: Object)
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
