<template lang="pug">
.c-wrapper(v-if='groups.length > 0')
  i18n.subtitle.c-subtitle(tag='h2') Groups chat shortcut

  ul.c-ul
    li.c-ul-li(
      v-for='(group, index) in groups'
      :key='`group-${index}`'
    )
      router-link.c-router.no-border(
        to='/group-chat'
        @click.native="$emit('select', group.contractID)"
      )
        avatar.c-avatar(
          src=''
          :alt='group.groupName'
          :fallbackbg='fallbackBg(index)'
        )
          // NOTE: mocked just for layout purposes
          badge.c-badge(:number='index === 0 ? 2 : 0')
            span.c-ul-li-char.has-text-weight-bold.has-text-white.is-size-5(aria-hidden='true') {{ group.groupName.charAt(0) }}
</template>

<script>
import Avatar from '../Avatar.vue'
import Badge from '../Badge.vue'

export default {
  // NOTE - maybe this approach should be used in the sidebar to switch between groups instead of a dropdown...
  name: 'GroupsShortcut',
  components: {
    Avatar,
    Badge
  },
  props: {
    groups: Array
  },
  data () {
    return {
    }
  },
  computed: {},
  methods: {
    fallbackBg (index) {
      // TODO/REVIEW $store - implement colors/avatars for groups
      return ['#958cfd', '#fd978c', '#62d27d'][index] || ''
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-wrapper {
  position: relative;
  padding-left: $spacer-sm;

  // fadeInRight: a gradient mask to indicate there are more groups by scrolling to the right.
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    background: linear-gradient(to right, rgba($background, 0), $background);
    width: 3rem;
    height: 100%;
    pointer-events: none;
  }
}

.c-avatar {
  opacity: 0.8;
}

.c-ul {
  display: flex;
  padding: $spacer 0;
  overflow-x: auto;

  &-li {
    position: relative;
    margin-right: $spacer;

    &:last-child {
      margin-right: $spacer*3; // To not be under fadeInRight
    }

    &:hover,
    &:focus {
      .c-avatar {
        opacity: 1;
      }
    }

    &-char {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      line-height: 1;
    }
  }
}

.c-router {
  display: block;
}

.c-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  transform: translate(44%, 44%);
  border: 2px solid $background;
}
</style>
