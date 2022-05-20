<template lang="pug">
page-section(v-if='showHistory' :title='L("Support History")')
  template(#cta='')
    i18n.support-history.button.is-outlined.is-small(
      tag='span'
      @click='toggleHistory'
    ) This period's overview
  support-history

page-section(v-else :title='L("This period overview")')
  template(#cta='')
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
