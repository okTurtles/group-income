<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-3.c-title(tag='h2') Browser notifications
      .c-divider
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Allow browser notifications
          i18n.c-description(tag='p') Get notifications to find out what's going on when you're not on Group Income. You can turn them off anytime.
        label
          input.switch(
            type='checkbox'
            name='switch'
            :checked='pushNotificationGranted'
            @change='handleNotificationSettings'
          )
      i18n.is-title-3.c-title(tag='h2') Email notifications
      .c-divider
      .c-subcontent
        .c-text-content
          i18n.c-smaller-title(tag='h3') Allow email notifications
          i18n.c-description(tag='p') Know when new proposals are created, their income and get a reminder to vote if they are about to expire.
        label
          input.switch(
            type='checkbox'
            name='switch'
            :checked='emailNotificationGranted'
          )
      //- i18n.c-name(tag='p') Emails sent
      //- .c-subcontent
      //-   .c-text-content
      //-     i18n.c-smaller-title(tag='h3') Proposals
      //-     i18n.c-description(tag='p') Know when new proposals are created, their income and get a reminder to vote if they are about to expire.
      //-   label
      //-     input.switch(
      //-       type='checkbox'
      //-       name='switch'
      //-       :checked='proposalsGranted'
      //-     )
      //- .c-subcontent
      //-   .c-text-content
      //-     i18n.c-smaller-title(tag='h3') Payments and contributions
      //-     i18n.c-description(tag='p') Know when new payments are due or when other members sent contributions your way.
      //-   label
      //-     input.switch(
      //-       type='checkbox'
      //-       name='switch'
      //-       :checked='paymentsAndContributionsGranted'
      //-     )
      //- .c-subcontent
      //-   .c-text-content
      //-     i18n.c-smaller-title(tag='h3') Chat
      //-     i18n.c-description(tag='p') Get notified when other members sent you messages. You can also change frequency of these emails.
      //-   label
      //-     input.switch(
      //-       type='checkbox'
      //-       name='switch'
      //-       :checked='chatGranted'
      //-     )
</template>

<script>
import { mapMutations } from 'vuex'
import { L } from '@common/common.js'
import {
  requestNotificationPermission,
  makeNotification
} from '@model/contracts/shared/nativeNotification.js'

export default ({
  name: 'NotificationSettings',
  data () {
    return {
      pushNotificationGranted: false,
      emailNotificationGranted: true,
      proposalsGranted: true,
      paymentsAndContributionsGranted: true,
      chatGranted: true
    }
  },
  mounted () {
    this.pushNotificationGranted = Notification?.permission === 'granted' && this.notificationEnabled
  },
  computed: {
    notificationEnabled () {
      return this.$store.state.settings.notificationEnabled
    }
  },
  methods: {
    ...mapMutations([
      'setNotificationEnabled'
    ]),
    async handleNotificationSettings (e) {
      let permission = Notification?.permission

      if (permission === 'default' && e.target.checked) {
        permission = await requestNotificationPermission(true)
      } else if (permission === 'denied') {
        alert(L('Sorry, you should reset browser notification permission again.'))
      }

      e.target.checked = this.pushNotificationGranted = e.target.checked && permission === 'granted'
      this.setNotificationEnabled(this.pushNotificationGranted)
      if (this.pushNotificationGranted) {
        makeNotification({
          title: L('Congratulations'),
          body: L('You have granted browser notification!')
        })
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  width: 100%;

  @include desktop {
    padding-top: 1.5rem;
  }

  .c-title {
    margin-bottom: 1rem;
  }
}

.c-subcontent {
  border: none;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 1.5rem;
  }
}

.c-smaller-title {
  font-size: $size_4;
  font-weight: bold;
}

.c-description {
  margin-top: 0.125rem;
  font-size: $size_4;
  color: $text_1;
}

.c-divider {
  margin: -0.5rem -2.5rem 1.5rem -2.5rem;
  border: solid 1px $general_1;
}

.c-name {
  color: $text_1;
  text-transform: uppercase;
  font-size: 0.75rem;
  margin-top: -1rem;
  margin-bottom: 1.5rem;
}
</style>
