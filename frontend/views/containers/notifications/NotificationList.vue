<template lang='pug'>
  div(:class='variant')
    .c-loading(v-if='ephemeral.isLoading')
      i18n.sr-only Loading...
      .c-skeleton(v-for='i in [0, 1, 2, 3]' :key='i')
        .c-skeleton-circle
        .c-skeleton-line

    .c-empty(v-else-if='!currentNotificationCount')
      i18n.has-text-1 Nothing to see here... yet!

    template(v-else v-for='list of notificationLists')
      span.is-subtitle.c-title(v-if='list.title') {{ list.title }}
      ul.c-list(
        :aria-label='list.title'
        @click='() => $emit("select")'
      )
        li(v-for='item of list.items')
          router-link.c-item(:to='item.linkTo' :class='item.read ? "" : "unread"' @click.native='markAsRead(item)')
            span.c-thumbCircle
              avatar-user(:username='item.avatarUsername' size='md')
              i(:class='`icon-${item.icon} ${iconBg(item.level)}`')
            span.c-item-content
              span.c-item-text(v-safe-html='item.body')
              span.c-item-date.has-text-1.has-text-small {{ ageTag(item) }}
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { timeSince } from '@model/contracts/shared/time.js'
import AvatarUser from '@components/AvatarUser.vue'
import {
  L
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path

export default ({
  name: 'NotificationList',
  props: {
    variant: {
      type: String,
      validator: (value) => ['compact', 'default'].includes(value),
      default: 'default'
    }
  },
  data: () => ({
    ephemeral: {
      isLoading: false
    }
  }),
  components: {
    AvatarUser
  },
  computed: {
    ...mapGetters([
      'currentNotificationCount',
      'currentNewNotifications',
      'currentOlderNotifications'
    ]),
    notificationLists () {
      const defaultCategory = 'OLDER'
      const lists = [
        { title: L('NEW'), items: this.currentNewNotifications },
        { title: L('OLDER'), items: this.currentOlderNotifications }
      ].filter(list => list.items.length > 0)

      // If the only currently non-empty list has a category like 'OLDER' or 'UNREAD', then its title does not need to be displayed.
      // See https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=4107%3A0
      if (lists.length === 1 && lists[0].title === defaultCategory) {
        lists[0].title = ''
      }
      return lists
    }
  },
  methods: {
    ageTag (item: Object): number {
      return timeSince(item.timestamp)
    },
    iconBg (level: string): string {
      return {
        info: 'has-background-primary has-text-primary',
        success: 'has-background-success has-text-success',
        danger: 'has-background-danger has-text-danger'
      }[level]
    },
    markAsRead (item: Object): void {
      sbp('gi.notifications/markAsRead', item)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-empty {
  padding: 3rem 1rem;
  text-align: center;
}

.c-loading {
  .compact & {
    padding: 0 1rem;
  }
}

.c-skeleton {
  display: flex;
  align-items: center;
  padding: 1rem 0;

  &-circle {
    display: block;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    margin-right: 0.5rem;
    background-color: $general_2;
  }

  &-line {
    flex-grow: 1;
    height: 1.5rem;
    border-radius: 0.7rem;
    background-color: $general_2;
  }
}

.c-title {
  display: block;
  padding: 0 0 0.5rem;

  @include tablet {
    padding-left: 0.5rem;
  }

  .compact & {
    padding-left: 1rem;
  }
}

.c-list {
  margin-bottom: 0.5rem;
}

.c-item {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 3rem;

  &:hover,
  &:focus {
    background-color: $general_2;
  }

  &:focus {
    z-index: 1;
    outline: 1px solid $primary_0;
  }

  &.unread {
    background-color: $general_2;
  }

  .default & {
    padding: 1rem 0.5rem;

    @include tablet {
      .c-item-text {
        display: block;
      }
    }
  }

  .compact & {
    padding: 1rem;
  }
}

.c-item-content {
  flex-grow: 1;
  margin-left: 0.5rem;
}

.c-item-date {
  margin-left: 0.5rem;

  @include tablet {
    .default & {
      margin-left: 0;
    }
  }
}

.c-thumbCircle {
  position: relative;
  display: inline-block;
  flex-shrink: 0;

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
