<template>
  <header class="c-header" :class="[routerBack ? 'subPage': 'mainPage']">
    <div class="level is-mobile is-marginless c-header-top">
      <router-link
        class="level-item button is-icon is-size-5 has-text-primary c-header-back"
         v-if="routerBack"
        :to="routerBack"
      >
        <i class="fa fa-angle-left"></i>
      </router-link>
      <div class="level-item c-header-text">
        <h2 class="title is-5 is-marginless gi-is-ellipsis c-header-title">
          <avatar src="/assets/images/group-income-icon-transparent-circle.png"
            alt="GroupIncome's logo"
            class="is-hidden-tablet"
            size="sm"
            v-if="!routerBack"
          />
          <template v-if="title">{{ title }}</template>
          <slot name="title" v-else></slot>
        </h2>
        <p class="has-text-text-light is-size-7 gi-is-ellipsis is-hidden-mobile" v-if="description">
          {{ description }}
        </p>
      </div>
      <div class="level-right">
        <slot name="actions"></slot>
      </div>
    </div>
    <slot> <!-- in case parent wants to add more stuff (ex: search )--></slot>
  </header>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.c-header {
  position: relative;
  padding: $gi-spacer $gi-spacer-sm;
  z-index: $gi-zindex-header;
  background-color: $body-background-color;

  // fadeOutTop: a gradient mask to fadeout nav on scroll.
  &::after {
    content: "";
    position: absolute;
    bottom: -$gi-spacer;
    left: 0;
    height: $gi-spacer;
    width: calc(100% - #{$gi-spacer}); // so it doesn't get above scrollbar
    background: linear-gradient($body-background-color, rgba($body-background-color, 0));
    pointer-events: none;
  }

  &-top {
    align-items: center;
  }

  &-text {
    min-width: 0; // so truncate works
    flex: 1; // so truncate works
  }

  .level-item.c-header-back {
    flex-grow: 0;
    flex-shrink: 0;
    margin: 0 $gi-spacer-sm;
  }

  &.mainPage {
    .c-header-text {
      margin-left: $gi-spacer-lg + $gi-spacer;
    }
  }

  &.subPage {
    .c-header-text {
      justify-content: flex-start;
    }
  }
}

@include phone {
  .c-header {
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    padding-left: 0;
  }
}

@include phablet {
  .c-header-back {
    display: none;
  }

  .c-header {
    &.mainPage {
      .c-header-text {
        margin-left: $gi-spacer-lg + $gi-spacer-sm;
      }
    }

    &.subPage {
      padding-left: $gi-spacer;
    }
  }
}

@include tablet {
  .c-header {
    &-top {
      padding-left: $gi-spacer-sm;
    }

    &-text {
      flex-direction: column;
      align-items: flex-start;
    }

    &.mainPage {
      .c-header-text {
        margin-left: 0;
        justify-content: flex-start;
      }

      .c-header-title {
        padding-left: 0;
      }
    }

    &.subPage {
      .c-header-top {
        align-items: flex-start; // so actions are top aligned
      }
    }
  }
}

</style>
<script>
import Avatar from './Avatar.vue'

export default {
  // TODO later - apply & adapt this MainHeader to all other pages
  // - maybe create ChatHeader that consumes MainHeader
  name: 'MainHeader',
  components: {
    Avatar
  },
  props: {
    title: String,
    description: String,
    routerBack: String
  }
}
</script>
