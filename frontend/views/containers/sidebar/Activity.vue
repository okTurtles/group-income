<template lang="pug">
menu-parent
  menu-trigger.is-icon(:class="{ 'has-text-white': isDarkTheme }")
    i.icon-bell(:class="activityCount ? '' : 'active'")
    span.c-badge(v-if='activityCount' data-test='alertNotification') {{ activityCount }}

  menu-content.c-content
    menu-header
      i18n Notifications

    ul
      menu-item(tag='router-link' itemid='hash-3' to='/somewhere-new')
        | New member proposal at Dreamers

      menu-item(tag='router-link' itemid='hash-3' to='/somewhere-new' hasdivider='')
        | TODO Design here

    .c-seeall
      router-link(to='#activity') See All
</template>

<script>
import { mapGetters } from 'vuex'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '@components/Menu/index.js'

export default {
  name: 'Activity',
  props: {
    activityCount: Number
  },
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ])
  },
  components: {
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuHeader,
    MenuItem
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-badge {
  position: absolute;
  top: -1px;
  right: -1px;
  line-height: 1rem;
  width: $spacer;
  height: $spacer;
  color: $background;
  background-color: $danger_0;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
}

.icon-bell {
  font-size: 0.9rem;
  transform-origin: center 2px;
  margin-top: 2px;
  &.active {
    font-weight: 900;
  }
}

button:hover,
button:focus {
  .icon-bell {
    animation: bell 750ms forwards;
  }
}

@keyframes bell {
  10% { transform: rotate(15deg); }
  20% { transform: rotate(-15deg); }
  35% { transform: rotate(15deg); }
  60% { transform: rotate(-10deg); }
  80% { transform: rotate(5deg); }
}

.c-content {
  left: 2rem;
  width: 16rem;
}

.c-seeall {
  padding: $spacer-sm;
  text-align: center;
}
</style>
