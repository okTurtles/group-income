<template lang="pug">
.c-page-design-system
  .c-page-wrapper
    header.c-page-header
      .c-page-title
        i.icon-three-circle-plus.c-header-icon
        h2.is-title-2 Design system

      .c-menu
        .section-title Topics:

        .c-menu-btns
          button.c-menu-btn(
            v-for='menu in menuList'
            :key='menu.id'
            :class='{ "is-active": currentContent.id === menu.id }'
            @click='onMenuClick(menu)'
          ) {{ menu.name }}

    main.c-main
      component(:is='currentContent.component')
</template>

<script>
import Typography from './design-system-content/ChelTypography.vue'
import Forms from './design-system-content/ChelForms.vue'
import Buttons from './design-system-content/ChelButtons.vue'
import Icons from './design-system-content/ChelIcons.vue'
import ListsTables from './design-system-content/ChelListsTables.vue'

const menuList = [
  { id: 'typography', name: 'Typography', component: Typography },
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
  },
  methods: {
    onMenuClick (menu) {
      this.currentContent = menu

      this.$router.push({ query: { tab: menu.id } }).catch(() => {})
    }
  },
  created () {
    const tabId = this.$route.query?.tab

    if (tabId) {
      const found = menuList.find(entry => entry.id === tabId)
      this.currentContent = found
    }
  },
  watch: {
    $route (to) {
      const tabId = to.query?.tab
      const menuIdList = menuList.map(m => m.id)

      if (tabId && menuIdList.includes(tabId) && this.currentContent.id !== tabId) {
        const found = menuList.find(entry => entry.id === tabId)
        this.currentContent = found
      }
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

    .section-title {
      font-size: $size_5;
      color: $text_0;
    }

    &-btns {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.785rem;
    }
  }
}

button.c-menu-btn {
  display: inline-block;
  border: 1px solid var(--ds-menu-border-color);
  color: $text_0;
  background-color: rgba(0, 0, 0, 0);
  min-height: unset;
  font-size: $size_6;
  padding: 0.375rem 0.75rem;
  border-radius: $radius;

  &:hover,
  &:focus {
    background-color: var(--ds-menu-border-color);
  }

  &:active,
  &.is-active {
    background-color: var(--ds-menu-border-color);
    font-weight: 600;
  }

  &.is-active::before {
    content: "";
    display: inline-block;
    position: relative;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: currentColor;
    margin-right: 0.25rem;
    transform: translateY(-1px);
  }
}

.c-main {
  @include sidePadding;
  width: 100%;
  overflow-x: hidden;
}
</style>
