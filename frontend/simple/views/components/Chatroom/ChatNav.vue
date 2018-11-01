<template>
  <div class="c-chatnav is-flex-tablet">
    <div class="c-header">
      <div class="level is-mobile is-marginless">
        <div class="level-left">
          <h1 class="title is-4 is-marginless c-title">{{title}}</h1>
        </div>
        <div class="level-right">
          <button class="button is-icon">
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
        </div>
      </div>
    </div>
    <div class="c-scrollable">
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

.c-header {
  padding: $gi-spacer $gi-spacer-sm;
  z-index: 2;
  background-color: $body-background-color;

  .c-actions-content {
    top: $gi-spacer-lg;
    right: 0;
    left: auto;
    width: 10rem;
  }
}

.c-scrollable {
  padding: $gi-spacer-sm;
}

@include mobile {
  $headerHeight: 4rem;

  .c-header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: $headerHeight;

    // fadeOutTop: a gradient mask to fadeout nav on scroll.
    // TODO - apply the same effect on sidebar
    &::after {
      content: "";
      position: absolute;
      bottom: -$gi-spacer-sm;
      left: 0;
      height: $gi-spacer-sm;
      width: 100%;
      background: linear-gradient($body-background-color, rgba($body-background-color, 0));
    }
  }

  .c-title {
    padding-left: $gi-spacer-lg + $gi-spacer;
  }

  .c-scrollable {
    padding-top: $headerHeight;
  }
}

@include tablet {
  .c-header {
    position: relative;
    flex-direction: column;
    width: 14rem;
    min-width: 14rem;
    border-right: 1px solid $grey-lighter;
  }

  .c-scrollable {
    overflow: auto;
  }
}
</style>
<script>
import { List } from '../Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../Menu/index.js'

export default {
  name: 'ChatNav',
  components: {
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
