<template lang='pug'>
header.c-header(
  :class='[routerBack ? "subPage": "mainPage"]'
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
        size='sm'
      )
        template(v-if='title') {{ title }}
        slot(v-else='' name='title')

      label.label(v-if='description') {{ description }}

    slot(name='actions')
  slot
    // in case parent wants to add more stuff (ex: search )
</template>

<script>
import Avatar from '@components/Avatar.vue'

export default ({
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
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-header {
  position: relative;
  padding: 1rem 0;
  z-index: $zindex-header;
  background-color: $background;

  // fadeOutTop: a gradient mask to fadeout nav on scroll.
  &::after {
    content: "";
    position: absolute;
    bottom: -1rem;
    left: 0;
    height: 1rem;
    width: calc(100% - 1rem); // so it doesn't get above scrollbar
    background: linear-gradient($background, rgba($background, 0));
    pointer-events: none;
  }
}

.c-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-avatar {
  margin-right: 1rem;
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
