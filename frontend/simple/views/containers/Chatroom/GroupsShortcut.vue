<template>
  <div class="c-wrapper" v-if="groupsByName.length > 0">
    <!-- REVIEW - This kind of title should be the style for .subtitle maybe ? -->
    <i18n tag="h2" class="has-text-grey is-size-7 is-uppercase c-subtitle">Groups chat shortcut</i18n>
    <ul class="c-ul">
      <li v-for="(group, index) in groupsByName" class="c-ul-li">
        <router-link to="/group-chat"
          @click.native="handleLinkClick(group.contractID)"
          class="c-router"
        >
          <avatar class="c-avatar"
            src="todo.jpg"
            :alt="group.groupName"
            :fallbackBg="fallbackBg(index)"
          />
          <badge class="c-badge" :number="group.groupChatUnread || index" />
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

  // maskScroll: a gradient mask to indicate there are more groups by scrolling to the right.
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
      margin-right: $gi-spacer*3; // To not be under maskScroll
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
import { mapGetters } from 'vuex'
import Avatar from '../../components/Avatar.vue'
import Badge from '../../components/Badge.vue'

export default {
  name: 'Chatroom',
  components: {
    Avatar,
    Badge
  },
  data () {
    return {
    }
  },
  computed: {
    ...mapGetters([
      'groupsByName'
    ])
  },
  methods: {
    handleLinkClick (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    },
    fallbackBg (index) {
      // TODO BE - implement colors/avatars for groups
      return ['#958cfd', '#fd978c', '#62d27d'][index] || ''
    }
  }
}
</script>
