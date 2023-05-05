<template lang="pug">
.c-page-design-system
  .c-page-wrapper
    header.c-page-header
      .c-page-title
        i.icon-three-circle-plus.c-header-icon
        h2.is-title-2 Design system

      .c-menu
        .section-title Menu:

        .c-menu-btns
          button.c-menu-btn(v-for='menu in menuList' :key='menu.id' @click='currentContent = menu') {{ menu.name }}

    main.c-main
      component(:is='currentContent.component')
</template>

<script>
import Forms from './design-system-content/ChelForms.vue'
import Buttons from './design-system-content/ChelButtons.vue'
import Icons from './design-system-content/ChelIcons.vue'
import ListsTables from './design-system-content/ChelListsTables.vue'

const menuList = [
  { id: 'forms', name: 'Forms', component: Forms },
  { id: 'buttons', name: 'Buttons', component: Buttons },
  { id: 'icons', name: 'Icons', component: Icons },
  { id: 'lists-and-tables', name: 'Lists & Tables', component: ListsTables }
]

export default {
  name: 'CheloniaDesignSystem',
  data () {
    return {
      currentContent: menuList[0],
      menuList
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin sidePadding {
  padding-left: 1rem;
  padding-right: 1rem;

  @include tablet {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.c-page-wrapper {
  position: relative;
  display: block;
  margin: 0 auto;
  border-left: 1px solid $border;
  border-right: 1px solid $border;
  width: 100%;
  max-width: 72rem;
  min-height: 100%;
}

.c-page-header {
  @include sidePadding;
  padding-top: 1.75rem;
  padding-bottom: 1.75rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid $border;

  .c-page-title {
    display: flex;
    align-items: center;

    .c-header-icon {
      display: inline-block;
      font-size: 2.25rem;
      line-height: 1;
      margin-right: 0.5rem;
    }
  }

  .c-menu {
    margin-top: 1.75rem;

    &-btns {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
    }
  }
}

button.c-menu-btn {
  border: none;
  font-weight: 600;
  color: $text_black;
  box-shadow: 0 0 10px rgba(202, 202, 202, 0.6);
  min-height: 2.25rem;

  &:nth-child(3n+1) { background-color: $secondary_purple_1; }
  &:nth-child(3n+2) { background-color: $secondary_blue_1; }
  &:nth-child(3n+3) { background-color: $secondary_green_1; }

  &:hover,
  &:active,
  &:focus {
    text-decoration: underline;
  }

  &:active {
    transform: translateY(1px);
  }
}

.c-main {
  @include sidePadding;
  width: 100%;
  overflow-x: hidden;
}
</style>
