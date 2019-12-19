<template lang='pug'>
  page-section(:title='L("Contributions")')
    .widget
      .column
        i18n(tag='h3').is-title-4 Payments sent
        div [Progress Bar]
        i18n.button.is-small Send payments
      .column
        i18n(tag='h3').is-title-4 Monetary
        .has-text-1 $250 will be used
        i18n.link Change
      .column
        i18n(tag='h3').is-title-4 Non-monetary
        .has-text-1 [You and 3 others members are contributing]
        i18n.link See all contributions

</template>

<script>
import { mapGetters } from 'vuex'
import PageSection from '@components/PageSection.vue'

export default {
  name: 'ContributionsWidget',
  components: {
    PageSection
  },
  data () {
    return {}
  },
  computed: {
    ...mapGetters([
      'currentGroupState',
      'ourUserIdentityContract'
    ])
  },
  methods: {}
}
</script>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.widget {
  display: flex;
}

.column {
  width: 25%;

  &:first-child {
    width: 50%;
  }
}
</style>
