<template lang='pug'>
  div
    template(v-for='(list, type) in notifications')
      span.is-subtitle.c-title {{ title(type) }}
      ul.c-list(:aria-label='title(type)' :class='variant')
        li.c-item(v-for='item of list')
          .c-thumbCircle
            avatar(:src='item.avatarUrlTODO' size='md')
            i(:class='`icon-${item.icon} ${iconBg(item.level)}`')
          .c-item-content
            p.c-item-text(v-html='item.text')
            span.c-item-date.has-text-1.has-text-small(v-html='item.date')
</template>

<script>
import * as templates from '@model/notifications/templates.js'
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
  components: {
    Avatar
  },
  computed: {
    notifications: () => {
      // CONTINUE HERE
      // TODO: human date, read status, fakeStore
      return {
        new: [
          templates.MEMBER_ADDED({ username: 'maggie', date: '1234' }),
          templates.MEMBER_REMOVED({ name: 'rob', date: '1234' })
        ],
        older: [
          templates.INCOMDE_DETAILS_OLD({ monthsCount: 4 }),
          templates.SEND_CONTRIBUTION({ month: 'July' }),
          templates.PROPOSAL_NEW({ creator: 'Sandy', type: 'votingRule' })
        ]
      }
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
