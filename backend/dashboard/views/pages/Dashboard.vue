<template lang='pug'>
page-template
  template(#title='') {{ L('Dashboard') }}

  section.c-stats-section
    i18n.section-title Stats

    .c-temp
      text-to-copy(textToCopy='This is a random text to copy!')

    .c-stat-cards
      stat-card.c-stat-card(v-for='(item, index) in ephemeral.stats'
        :key='item.id'
        :description='item.name'
        :stat='item.value'
        :icon='item.icon'
        :color='index % 2 === 0 ? "blue" : "purple"'
      )

  section.c-recent-and-summary
    i18n.section-title Users / Space

    .c-flex-container
      .summary-list
        i18n.summary-list-label Recent users

        ul
          li.summary-list-item.c-user-list-ths
            i18n(tag='label') Name
            i18n(tag='label') Joined on
          li.summary-list-item(v-for='user in ephemeral.recentUsers' :key='user.name')
            span {{ user.name }}
            span {{ humanDate(user.joined) }}

      .summary-list.is-outlined
        i18n.summary-list-label Sapce usage

        ul
          li.summary-list-item(v-for='(item, key) in ephemeral.spaceUsage' :key='key')
            label {{ item.name }}
            span.c-usage-value {{ item.value }} {{ item.unit }}
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import StatCard from '@components/StatCard.vue'
import TextToCopy from '@components/TextToCopy.vue'
import L from '@common/translations.js'
import { addTimeToDate, MONTHS_MILLIS, humanDate } from '@common/cdTimeUtils.js'

const PAST_THREE_MONTHS = -3 * MONTHS_MILLIS
const randomPastDate = () => addTimeToDate(new Date(), Math.floor(Math.random() * PAST_THREE_MONTHS))

export default {
  name: 'Dashboard',
  components: {
    PageTemplate,
    StatCard,
    TextToCopy
  },
  data () {
    return {
      ephemeral: {
        // ------ temporary dummy placeholder data ------ //
        stats: [
          { id: 'users', name: L('Total users'), value: 2150, icon: 'trend-up' },
          { id: 'groups', name: L('Total groups'), value: 23, icon: 'chart-bar' },
          { id: 'storage', name: L('Total storage'), value: '2GB', icon: 'battery-charging' }
        ],
        recentUsers: [
          { name: 'TaoEffect', joined: randomPastDate() },
          { name: 'Leilha P', joined: randomPastDate() },
          { name: 'Alex Jin', joined: randomPastDate() },
          { name: 'Sebin Song', joined: randomPastDate() },
          { name: 'Pierre', joined: randomPastDate() }
        ].sort((a, b) => b.joined.getTime() - a.joined.getTime()),
        spaceUsage: {
          database: { name: L('Database'), value: 1.8, unit: 'Gb' },
          media: { name: L('Media/Images'), value: 500, unit: 'Mb' }
        }
      }
    }
  },
  methods: {
    humanDate
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-stats-section {
  margin-bottom: 3.2rem;
}

.c-stat-cards {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.c-flex-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 1.75rem;
}

.c-user-list-ths {
  font-weight: 600;
  font-size: $size_5;
  margin-bottom: 0.25rem;
}

.c-usage-value {
  font-weight: 600;
  font-size: 1.25em;
}
</style>
