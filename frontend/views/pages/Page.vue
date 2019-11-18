<template lang='pug'>
div(:data-test='pageTestName' :class='$scopedSlots.sidebar ? "p-with-sidebar" : "p-no-sidebar"')
  header.p-header
    slot(name='header')
    h1.is-title-2.p-title(:data-test='pageTestHeaderName' v-if='$slots.title')
      img.c-logo(
        src='/assets/images/group-income-icon-transparent.png'
        :alt='L("Group Income\'s logo")'
      )
      slot(name='title')

    p(
      v-if='$scopedSlots.description'
      class='p-descritpion'
    )
      slot(name='description')

  main.p-main(:class='mainClass')
    slot

  nav.p-sidebar(
    :role='L("Secondary")'
    v-if='$scopedSlots.sidebar'
    :class='{ "is-active": ephemeral.isActive }'
  )
    toggle(@toggle='toggleMenu' element='sidebar' :aria-expanded='ephemeral.isActive')
    .p-sidebar-inner(:inert='isInert')
      slot(name='sidebar')
</template>

<script>
import Toggle from '@containers/sidebar/Toggle.vue'
import { DESKTOP } from '@view-utils/breakpoints.js'
import { debounce } from '@utils/giLodash.js'

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
      config: {
        debounceResize: debounce(this.checkIsTouch, 250)
      },
      ephemeral: {
        isActive: false,
        isTouch: null
      }
    }
  },
  created () {
    this.checkIsTouch()
  },
  mounted () {
    // TODO - Create a single resize listener to be reused on components
    window.addEventListener('resize', this.config.debounceResize)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.config.debounceResize)
  },
  computed: {
    isInert () {
      return !this.ephemeral.isActive && this.ephemeral.isTouch
    }
  },
  methods: {
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },
    checkIsTouch () {
      this.ephemeral.isTouch = window.innerWidth < DESKTOP
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$pagePadding: 1rem;
$pagePaddingDesktop: 5.5rem;

.p-with-sidebar,
.p-no-sidebar {
  height: 100vh;
  width: 100vw;
  overflow: auto;

  @include desktop {
    width: auto;
  }
}

.p-with-sidebar {
  display: grid;
  grid-template-areas: "p-header" "p-main";
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(0, 1fr);

  @include desktop {
    grid-template-columns: 1fr $rightSideWidth;
    grid-template-areas:
      "p-header p-sidebar"
      "p-main p-sidebar";
  }
}

.p-main {
  grid-area: p-main;
  width: calc(100% - #{$spacer-lg});
  margin: 0 auto;
  padding-top: $spacer*1.5;
  max-width: 50rem;
  @include overflow-touch;

  &.full-width {
    max-width: 100%;
  }

  @include tablet {
    width: calc(100% - #{$spacer-xl});
  }

  @include desktop {
    width: auto;
    padding-top: 0;
    margin-right: $spacer-lg;
    margin-left: $pagePaddingDesktop;
  }
}

.p-header {
  grid-area: p-header;
  transition: padding ease-out 300ms;
  text-align: center;
  min-height: 4rem;

  @include touch {
    display: flex;
    justify-content: center;
    align-items: center;
    position: sticky;
    top: 0;
    background: $general_2;
  }

  @include desktop {
    display: block;
    padding-top: 1.125rem;
    text-align: left;
    min-height: 4.75rem;
    padding-left: $pagePaddingDesktop;
  }
}

.p-title {
  display: flex;
  align-items: center;
}

.p-descritpion {
  font-weight: normal;
  font-size: $size-5; // 12px
  line-height: 1rem;
  color: $text_1;
  display: none;
  padding-bottom: 3rem;

  @include desktop {
    display: block;
  }
}

.c-logo {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: $spacer;

  @include desktop {
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
  background-color: $general_2;
  transform: translateX(100%);
  transition: transform $transitionSpeed;

  &-inner {
    padding: $spacer*1.5 $spacer*1.5 $spacer;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  @include desktop {
    position: sticky;
    top: 0;
    transform: translateX(0%);
  }

  .c-toggle {
    right: 100%;
  }

  &.is-active {
    transform: translateX(0);

    .c-toggle {
      height: 100vh;
    }
  }
}

</style>
