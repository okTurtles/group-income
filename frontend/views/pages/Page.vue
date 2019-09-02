<template lang="pug">
div(:data-test='pageTestName' :class='$scopedSlots.sidebar ? "p-with-sidebar" : "p-no-sidebar"')
  header.p-header
    h1.p-title(:data-test='pageTestHeaderName')
      img.c-logo(src='/assets/images/group-income-icon-transparent.png' alt="GroupIncome's logo")
      i18n
        slot(name='title')
    i18n(
      v-if='$scopedSlots.description'
      class='p-descritpion'
      tag='p'
    )
      slot(name='description')

  main.p-main(:class='mainClass')
    slot

  aside.p-sidebar(
    v-if='$scopedSlots.sidebar'
    :class="{ 'is-active': ephemeral.isActive }"
  )
    toggle(@toggle='toggleMenu' element='sidebar')
    slot(name='sidebar')
</template>

<script>
import Toggle from '@containers/sidebar/Toggle.vue'

export default {
  name: 'Page',
  components: {
    Toggle
  },
  props: {
    pageTestName: String,
    pageTestHeaderName: String,
    mainClass: String
  },
  data () {
    return {
      ephemeral: {
        isActive: false
      }
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/style/_variables.scss";

$pagePadding: 1rem;
$pagePaddingTablet: 24px;
$pagePaddingDesktop: 5.5rem;

.p-no-sidebar {
  height: 100vh;
  width: 100vw;

  @include tablet {
    overflow: auto;
    width: auto;
  }
}

.p-with-sidebar {
  display: grid;
  overflow: auto;
  grid-template-areas: "p-header" "p-main";
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100vw;
  height: 100vh;

  @include tablet {
    width: auto;
  }

  @include widescreen {
    grid-template-columns: 1fr $rightSideWidth;
    grid-template-areas:
      "p-header p-sidebar"
      "p-main p-sidebar";
  }
}

.p-main {
  grid-area: p-main;
  padding-left: $spacer;
  padding-right: $spacer;
  margin-right: auto;
  max-width: 43rem;

  &.full-width {
    max-width: 100%;
  }

  @include tablet {
    padding-left: $pagePaddingTablet;
  }

  @include widescreen {
    padding-left: $pagePaddingDesktop;
  }
}

.p-header {
  grid-area: p-header;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: padding ease-out 300ms;
  text-align: center;
  min-height: 4rem;

  @include tablet {
    display: block;
    padding-top: 1.125rem;
    padding-left: $pagePaddingTablet;
    text-align: left;
    min-height: 4.75rem;
  }

  @include widescreen {
    padding-left: $pagePaddingDesktop;
    min-height: 5.25rem;
  }
}

.p-title {
  text-transform: capitalize;
  font-size: $size-4;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: $spacer;

  @include tablet {
    justify-content: flex-start;
    font-size: $size-2;
  }
}

.p-descritpion {
  font-weight: normal;
  font-size: $size-5; // 12px
  line-height: 1rem; // 16px
  color: $text_1;
  display: none;
  padding-bottom: 3rem;

  @include tablet {
    display: block;
  }
}

.c-logo {
  width: $spacer;
  height: $spacer;
  margin-right: 0.5rem;

  @include tablet {
    display: none;
  }
}

.p-sidebar {
  grid-area: p-sidebar;
  position: absolute;
  z-index: $zindex-sidebar;
  right: 0;
  width: $rightSideWidth;
  height: 100vh;
  padding: 1.5rem 1.5rem $spacer 1.5rem;
  background-color: $general_2;
  transform: translateX(100%);
  transition: transform $transitionSpeed;

  &.is-active {
    transform: translateX(0);
  }

  @include widescreen {
    position: relative;
    transform: translateX(0%);
    // TODO: handle on small screens
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .c-toggle {
    right: 100%;
    height: 64px;

    @include widescreen {
      display: none;
      height: 79px;
    }
  }
}

</style>
