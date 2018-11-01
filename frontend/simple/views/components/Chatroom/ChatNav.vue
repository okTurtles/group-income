<template>
  <div class="c-chatnav is-flex-tablet">
    <chat-header :title="title">
      <button class="button is-icon is-hidden-tablet">
        <!-- TODO design search results mobile -->
        <i class="fa fa-search"></i>
      </button>
      <menu-parent class="level-right">
        <menu-trigger class="is-icon">
          <i class="fa fa-ellipsis-v"></i>
        </menu-trigger>

        <!-- TODO be a drawer on mobile -->
        <menu-content class="c-actions-content">
          <list hasMargin>
            <menu-item tag="button" itemId="hash-1" icon="heart">
              Settings
            </menu-item>
            <menu-item tag="button" itemId="hash-2" icon="heart" hasDivider>
              Mute chat
            </menu-item>
            <menu-item tag="button" itemId="hash-3" icon="heart">
              Report a problem
            </menu-item>
          </list>
        </menu-content>
      </menu-parent>
    </chat-header>
    <div class="c-chatnav-body">
      <!-- TODO design better search results -->
      <input class="input is-hidden-mobile" type="text"
        v-if="searchPlaceholder"
        :placeholder="searchPlaceholder"
        @change="$emit('search')">

      <slot><!-- Content for each chatNav is up to the parent --></slot>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatnav {
  .c-actions-content {
    top: $gi-spacer-lg;
    right: 0;
    left: auto;
    width: 10rem;
  }

  &-body {
    padding: $gi-spacer-sm;
  }
}

@include mobile {
  .c-chatnav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    max-height: 100vh;
    overflow: auto;

    &-body {
      padding-top: 5rem;
      padding-bottom: $gi-spacer-lg;
    }
  }
}

@include tablet {
  .c-chatnav {
    position: relative;
    flex-direction: column;
    width: 14rem;
    min-width: 14rem;
    border-right: 1px solid $grey-lighter;

    &-body {
      overflow: auto;
    }
  }
}
</style>
<script>
import ChatHeader from './ChatHeader.vue'
import { List } from '../Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../Menu/index.js'

export default {
  name: 'ChatNav',
  components: {
    ChatHeader,
    List,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuHeader,
    MenuItem
  },
  props: {
    title: String,
    searchPlaceholder: String
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
