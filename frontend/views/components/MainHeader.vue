<template lang="pug">
header.c-header(
  :class="[routerBack ? 'subPage': 'mainPage']"
  role='banner'
)
  .level.is-mobile.is-marginless.c-header-top
    router-link.level-item.button.is-icon.is-size-5.has-text-primary.c-header-back(
      v-if='routerBack'
      :to='routerBack'
    )
      i.icon-angle-left

    .level-item.c-header-text
      h2.is-5.c-header-title
        avatar.is-hidden-tablet(
          v-if='!routerBack'
          src='/assets/images/group-income-icon-transparent-circle.png'
          alt="GroupIncome's logo"
        )
          template(v-if='title') {{ title }}
          slot(v-else='' name='title')

      p.is-size-7.is-hidden-mobile(v-if='description')
        | {{ description }}

    .level-right
      slot(name='actions')
  slot
    // in case parent wants to add more stuff (ex: search )
</template>

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

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

.c-header {
  position: relative;
  padding: $spacer $spacer-sm;
  z-index: $zindex-header;
  background-color: $body-background-color;

  // fadeOutTop: a gradient mask to fadeout nav on scroll.
  &::after {
    content: "";
    position: absolute;
    bottom: -$spacer;
    left: 0;
    height: $spacer;
    width: calc(100% - #{$spacer}); // so it doesn't get above scrollbar
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
    margin: 0 $spacer-sm;
  }

  &.mainPage {
    .c-header-text {
      margin-left: $spacer-lg + $spacer;
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
        margin-left: $spacer-lg + $spacer-sm;
      }
    }

    &.subPage {
      padding-left: $spacer;
    }
  }
}

@include tablet {
  .c-header {
    &-top {
      padding-left: $spacer-sm;
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
