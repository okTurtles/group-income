<template lang='pug'>
  div
    template(v-if='ephemeral.isLoading')
      i18n.has-text-1 Loading...
    template(v-else v-for='(list, type) in notifications')
      span.is-subtitle.c-title {{ title(type) }}
      ul.c-list(:aria-label='title(type)' :class='variant')
        li.c-item(v-for='item of list')
          // TODO - add link
          .c-thumbCircle
            avatar(:src='item.avatarUrlTODO' size='md')
            i(:class='`icon-${item.icon} ${iconBg(item.level)}`')
          .c-item-content
            p.c-item-text(v-html='item.body')
            span.c-item-date.has-text-1.has-text-small(v-html='item.date')
</template>

<script>
import { mapGetters } from 'vuex'
import * as templates from '@model/notifications/templates.js'
import fakeDBWithNotifications from '@model/notifications/fakeDB.js'
import Avatar from '@components/Avatar.vue'
import L from '@view-utils/translations.js'

export default {
  name: 'NotificationsList',
  props: {
    variant: {
      type: String,
      validator: (value) => ['compact', 'default'].includes(value),
      default: 'defaut'
    }
  },
  data: () => ({
    config: {
      notifications: null
    },
    ephemeral: {
      isLoading: true
    }
  }),
  components: {
    Avatar
  },
  mounted () {
    // TODO this (All dumb logic for now)

    // Simulate view with no notifications
    if (this.groupMembersCount === 1) {
      this.config.notifications = null
      this.ephemeral.isLoading = false
      return
    }

    // Simulate view with only 1 notification
    if (this.groupMembersCount === 2) {
      this.ephemeral.isLoading = true
      setTimeout(() => {
        // handpick a notification that is "MEMBER_ADDED"
        this.config.notifications = {
          3213: fakeDBWithNotifications[3213]
        }
        this.ephemeral.isLoading = false
      })
      return
    }

    // Load notifications from fake DB
    this.ephemeral.isLoading = true
    setTimeout(() => {
      this.config.notifications = fakeDBWithNotifications
      this.ephemeral.isLoading = false
    }, 1500)
  },
  computed: {
    ...mapGetters([
      'groupMembersCount'
    ]),
    dateNow () {
      // Hardcoded so the dummy layout makes sense
      return 1590825807327
    },
    notifications () {
      if (!this.config.notifications) {
        return {}
      }

      const list = {}
      const listNew = []
      const listOlder = []
      const hourMs = 3600000

      for (const nId in this.config.notifications) {
        const { timestamp, type, data } = this.config.notifications[nId]
        const listToPush = this.dateNow - timestamp < hourMs ? listNew : listOlder
        listToPush.push(templates[type]({ data, timestamp }))
      }

      if (listNew.length > 0) {
        list.new = listNew
      }

      if (listOlder.length > 0) {
        list.older = listOlder
      }

      return list
    }
  },
  methods: {
    title: (type) => {
      return {
        new: L('New'),
        older: L('Older')
      }[type]
    },
    iconBg: (level) => {
      return {
        info: 'has-background-primary has-text-primary',
        success: 'has-background-success has-text-success',
        danger: 'has-background-danger has-text-danger'
      }[level]
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-title {
  padding: 0 0 0.5rem 1rem;
}

.c-list {
  margin-bottom: 0.5rem;
}

.c-item {
  display: flex;
  align-items: center;
  min-height: 3rem;

  &-content {
    flex-grow: 1;
    margin-left: 0.5rem;
  }

  .c-list.compact & {
    padding: 1rem;

    .c-item-text {
      display: inline;
    }

    .c-item-date {
      margin-left: 0.5rem;
    }
  }

  .c-list.default & {
    padding: 1rem 0.5rem;
  }
}

.c-thumbCircle {
  position: relative;
  display: inline-block;

  i {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 1rem;
    height: 1rem;
    font-size: 0.5rem;
    line-height: 1rem;
    text-align: center;
    border-radius: 50%;
  }
}
</style>
