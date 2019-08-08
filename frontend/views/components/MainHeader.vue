<template lang="pug">
header.c-header(
  :class="[routerBack ? 'subPage': 'mainPage']"
  role='banner'
)
  .c-header-top
    router-link.button.is-icon(
      v-if='routerBack'
      :to='routerBack'
    )
      i.icon-angle-left

    .c-header-text
      avatar(
        v-if='!routerBack'
        src='/assets/images/group-income-icon-transparent-circle.png'
        alt='GroupIncome\'s logo'
      )
        template(v-if='title') {{ title }}
        slot(v-else='' name='title')

      i18n.label(
        v-if='description'
        tag='label'
      ) {{ description }}

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
  padding: $spacer 0;
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
}

.c-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-avatar {
  margin-right: $spacer;
}

.c-header-text {
  display: flex;
  flex: 1;
  align-items: center;

  .label {
    margin-bottom: 0;
  }
}

</style>
