<template>
  <header class="c-header" :class="[routerBack ? 'subPage': 'mainPage']">
    <div class="level is-mobile is-marginless c-header-top">
      <div class="level-left c-header-left">
        <router-link
          class="button is-icon is-size-5 has-text-primary c-back"
          v-if="routerBack"
          :to="routerBack"
        >
          <i class="fa fa-angle-left"></i>
        </router-link>
        <div class="gi-is-ellipsis c-header-text">
          <h2 class="title is-4 is-marginless gi-is-ellipsis" :class="{ 'is-5': routerBack }">
            {{ title }}
          </h2>
          <p class="is-size-7 has-text-grey gi-is-ellipsis is-hidden-mobile" v-if="description">
            {{ description }}
          </p>
        </div>
      </div>
      <div class="level-right">
        <slot name="actions"></slot>
      </div>
    </div>
    <slot> <!-- in case parent wants to add more stuff (ex: search )--></slot>
  </header>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

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
  }

  &-left {
    min-width: 0; // so truncate works correctly
    flex-shrink: 1;
  }

  &.mainPage {
    .c-header-text {
      padding-left: $gi-spacer-lg + $gi-spacer;

      @include phablet {
        padding-left: $gi-spacer-lg + $gi-spacer-sm;
      }

      @include tablet {
        padding-left: 0;
      }
    }
  }

  &.subPage {
    .c-header-top {
      align-items: flex-start;
    }

    .c-header-text {
      margin-top: $gi-spacer-xs;
    }
  }
}

.c-back {
  flex-shrink: 0;
  margin-right: $gi-spacer-sm;
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
  .c-back {
    display: none;
  }
}

@include tablet {
  .c-header-top {
    padding-left: $gi-spacer-sm;
  }
}

</style>
<script>
export default {
  name: 'ChatHeader',
  props: {
    title: String,
    description: String,
    routerBack: String
  }
}
</script>
