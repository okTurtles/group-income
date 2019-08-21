<template lang="pug">
div(:data-test='pageTestName' :class='$scopedSlots.sidebar ? "p-with-sidebar" : "p-no-sidebar"')
  header.p-header
    h1.p-title(:data-test='pageTestHeaderName')
      img.c-logo(src='/assets/images/group-income-icon-transparent.png' alt="GroupIncome's logo")
      i18n
        slot(name='title')

  main.p-main
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
    pageTestHeaderName: String
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
$pagePaddingDesktop: 75px;

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
  overflow: hidden;
  grid-template-areas: "p-header" "p-main";
  grid-template-columns: 1fr;
  grid-template-rows: 64px 1fr;
  width: 100vw;
  height: 100vh;

  @include tablet {
    width: auto;
  }

  @include widescreen {
    grid-template-columns: 1fr $rightSideWidth;
    grid-template-rows: 79px auto;
    grid-template-areas:
      "p-header p-sidebar"
      "p-main p-sidebar";
  }
}

.p-main {
  grid-area: p-main;
  overflow: auto;
}

.p-header {
  grid-area: p-header;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid $general_0;
  transition: padding ease-out 300ms;

  background-color: $primary_2;
  text-align: center;
  padding-left: 0;

  @include tablet {
    padding-left: $pagePaddingTablet;
    background-color: $background;
    text-align: left;
  }

  @include widescreen {
    padding-left: $pagePaddingDesktop;
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

.c-logo {
  width: $spacer;
  height: $spacer;
  margin-right: 0.5rem;

  @include tablet {
    display: none;
  }
}

.p-section-header,
.p-section {
  padding: 1.5rem $pagePadding; // Futur proof just add margin to add bubble
  transition: padding ease-out 300ms;
  background-color: $background;

  @include tablet {
    padding: 1.5rem $pagePaddingTablet;
  }

  @include widescreen {
    padding: 1.5rem $pagePaddingDesktop;
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
  background-color: var(--general_2);
  transform: translateX(100%);
  transition: transform $transitionSpeed;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  &.is-active {
    transform: translateX(0);
  }

  @include widescreen {
    position: relative;
    transform: translateX(0%);
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
