<template>
  <header class="level is-mobile is-marginless c-header">
    <div class="level-left c-header-text">
      <router-link
        class="button is-icon is-size-5 has-text-primary is-hidden-tablet c-back"
        v-if="routerBack"
        :to="routerBack"
      >
        <i class="fa fa-angle-left"></i>
      </router-link>
      <div class="gi-is-ellipsis" :class="{ 'c-is-mainPage': !routerBack }">
        <h2 class="title is-4 is-marginless gi-is-ellipsis" :class="{ 'is-5': routerBack }">
          {{ title }}
        </h2>
        <p class="is-size-7 has-text-grey gi-is-ellipsis is-hidden-mobile" v-if="description">
          {{ description }}
        </p>
      </div>
    </div>
    <div class="level-right">
      <slot></slot>
    </div>
  </header>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";
$headerHeight: 4rem;

.c-header {
  position: relative;
  padding: $gi-spacer $gi-spacer-sm;
  min-height: $headerHeight;
  z-index: $gi-zindex-header;
  background-color: $body-background-color;

  // fadeOutTop: a gradient mask to fadeout nav on scroll.
  // TODO - apply the same effect on sidebar
  &::after {
    content: "";
    position: absolute;
    bottom: -$gi-spacer;
    left: 0;
    height: $gi-spacer;
    width: 100%;
    background: linear-gradient($body-background-color, rgba($body-background-color, 0));
  }

  &-text {
    max-width: 70%;
  }

  @include mobile {
    position: fixed;
    left: 0;
    width: 100vw;
    top: 0;
    padding-left: 0;

    .c-is-mainPage {
      padding-left: $gi-spacer-lg + $gi-spacer; // Space for menu toggle
    }
  }
}

.c-back {
  flex-shrink: 0;
  margin-right: $gi-spacer-sm;
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
