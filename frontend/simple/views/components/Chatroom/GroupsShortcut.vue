<template>
  <div class="c-wrapper" v-if="groups.length > 0">
    <!-- REVIEW/TODO - make this kind of text should be the style for .subtitle -->
    <i18n tag="h2" class="has-text-grey is-size-6 is-uppercase c-subtitle">Groups chat shortcut</i18n>
    <ul class="c-ul">
      <li v-for="(group, index) in groups" class="c-ul-li">
        <router-link to="/group-chat"
          @click.native="$emit('select', group.contractID)"
          class="c-router"
        >
          <avatar class="c-avatar"
            src=""
            :alt="group.groupName"
            :fallbackBg="fallbackBg(index)"
          />
          <!-- NOTE: mocked just for layout purposes -->
          <badge class="c-badge" :number="index === 0 ? 2 : 0" />
          <span aria-hidden="true" class="c-ul-li-char has-text-weight-bold has-text-white is-size-5">{{ group.groupName.charAt(0) }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-wrapper {
  position: relative;
  padding-left: $gi-spacer-sm;

  // fadeInRight: a gradient mask to indicate there are more groups by scrolling to the right.
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    right: 0;
    background: linear-gradient(to right, rgba($body-background-color, 0), $body-background-color);
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
  padding: $gi-spacer 0;
  overflow-x: auto;

  &-li {
    position: relative;
    margin-right: $gi-spacer;

    &:last-child {
      margin-right: $gi-spacer*3; // To not be under fadeInRight
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
  border: 2px solid $body-background-color;
}
</style>
<script>
import Avatar from '../Avatar.vue'
import Badge from '../Badge.vue'

export default {
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
