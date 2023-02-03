<template lang='pug'>
page-template
  template(#title='') {{ L('Dashboard') }}

  .c-stats-summary-container
    i18n.section-title Stats
    .c-stat-cards
      stat-card.c-stat-card(v-for='(item, index) in ephemeral.stats'
        :key='item.id'
        :description='item.name'
        :stat='item.value'
        :color='index % 2 === 0 ? "blue" : "purple"'
      )

  .c-users-and-storage-container
    .c-joined-users
      i18n.c-user-list-label.is-title-4 Recent users

      ul.c-user-list
        li.c-user-list-ths
          i18n Name
          i18n Joined on
        li.c-user-list-item(v-for='user in ephemeral.recentUsers' :key='user.name')
          .c-username {{ user.name }}
          .c-joined-date {{ humanDate(user.joined) }}
</template>

<script>
import PageTemplate from './PageTemplate.vue'
import StatCard from '@components/StatCard.vue'
import L from '@common/translations.js'
import { addTimeToDate, MONTHS_MILLIS, humanDate } from '@common/cdTimeUtils.js'

const PAST_THREE_MONTHS = -3 * MONTHS_MILLIS
const randomPastDate = () => addTimeToDate(new Date(), Math.floor(Math.random() * PAST_THREE_MONTHS))

export default {
  name: 'Dashboard',
  components: {
    PageTemplate,
    StatCard
  },
  data () {
    return {
      ephemeral: {
        // temporary dummy placeholder data
        stats: [
          { id: 'users', name: L('Total users'), value: 2150 },
          { id: 'groups', name: L('Total groups'), value: 23 },
          { id: 'storage', name: L('Total storage'), value: '2GB' }
        ],
        recentUsers: [
          { name: 'TaoEffect', joined: randomPastDate() },
          { name: 'Leilha P', joined: randomPastDate() },
          { name: 'Alex Jin', joined: randomPastDate() },
          { name: 'Sebin Song', joined: randomPastDate() },
          { name: 'Pierre', joined: randomPastDate() }
        ].sort((a, b) => b.joined.getTime() - a.joined.getTime())
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

.c-stats-summary-container {
  margin-bottom: 2rem;
}

.c-stat-cards {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.c-users-and-storage-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.25rem;
}

.c-joined-users {
  position: relative;
  background-color: $background_1;
  padding: 1.5rem;
  border-radius: 1rem;
  min-width: 18.5rem;
}

.c-user-list-label {
  display: block;
  margin-bottom: 0.75rem;
}

.c-user-list-ths,
.c-user-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-user-list-ths {
  font-weight: 600;
  font-size: 0.9em;
  margin-bottom: 0.25rem;
}

.c-user-list-item  {
  line-height: 1.8;
}
</style>
