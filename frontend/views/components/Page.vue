<template lang='pug'>
div(:data-test='pageTestName + "-page"' :class='$scopedSlots.sidebar ? "p-with-sidebar" : "p-no-sidebar"')
  header.p-header(
    :class='miniHeader ? "p-mini-header" : ""'
  )
    slot(name='header')
    h1.is-title-2.p-title(:data-test='pageTestHeaderName' v-if='$slots.title')
      img.c-logo(
        src='/assets/images/group-income-icon-transparent.png'
        alt=''
      )
      span
        slot(name='title')

    toggle(
      v-if='$scopedSlots.sidebar'
      @toggle='toggleMenu'
      v-bind='toggleProps'
      :show-badge='true'
    )

    slot(name='description')

  main.p-main(:class='mainClass')
    slot

  section.p-sidebar(
    v-if='$scopedSlots.sidebar'
    :class='{ "is-active": ephemeral.isActive }'
  )
    i18n.sr-only(tag='h2') Page details
    toggle(
      @toggle='toggleMenu'
      v-bind='toggleProps'
    )
    .p-sidebar-inner(:inert='isInert')
      slot(name='sidebar' :toggle='toggleMenuIfTouch')
</template>

<script>
import Toggle from '@components/Toggle.vue'
import { DESKTOP } from '@view-utils/breakpoints.js'
import { debounce } from 'turtledash'

export default ({
  name: 'Page',
  components: {
    Toggle
  },
  props: {
    pageTestName: String,
    pageTestHeaderName: String,
    mainClass: String,
    miniHeader: {
      type: Boolean,
      default: false
    }
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
    },
    showChatToggleIcon () {
      return ['GroupChat', 'GroupChatConversation', 'GlobalDirectMessages'].includes(this.$route.name)
    },
    toggleProps () {
      return {
        element: this.showChatToggleIcon ? 'chat' : 'sidebar',
        'aria-expanded': this.ephemeral.isActive
      }
    }
  },
  methods: {
    toggleMenuIfTouch () {
      if (this.ephemeral.isTouch) {
        this.toggleMenu()
      }
    },
    toggleMenu () {
      this.ephemeral.isActive = !this.ephemeral.isActive
    },
    checkIsTouch () {
      this.ephemeral.isTouch = window.innerWidth < DESKTOP
    },
    findAndScrollToAnchor (str) {
      const anchorEl = document.getElementById(str) || this.$el.querySelector(`[name="${CSS.escape(str)}"]`)
      if (anchorEl) {
        anchorEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (anchorEl.tabIndex >= 0 || anchorEl.hasAttribute('tabindex')) {
          anchorEl.focus()
        }
      }
    }
  },
  watch: {
    '$route': {
      immediate: true,
      handler (to, from) {
        if (to.hash && from?.hash !== to.hash) {
          setTimeout(() => {
            this.findAndScrollToAnchor(to.hash.slice(1))
          }, 100)
        }
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$pagePadding: 1rem;
$pagePaddingDesktop: 5.5rem;

.p-with-sidebar,
.p-no-sidebar {
  height: 100%;
  width: 100vw;

  @include desktop {
    height: 100%;
    width: auto;
  }
}

.p-with-sidebar {
  display: grid;
  grid-template-areas: "p-header" "p-main";
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);

  @include desktop {
    grid-template-columns: minmax(0, 1fr) $rightSideWidth;
    grid-template-areas:
      "p-header p-sidebar"
      "p-main p-sidebar";
  }
}

.p-main {
  grid-area: p-main;
  width: calc(100% - 2rem);
  margin: 0 auto;
  padding-top: 1.5rem;
  max-width: 50rem;
  height: fit-content;
  @include overflow-touch;

  &.full-width {
    max-width: 100%;
  }

  @include tablet {
    width: calc(100% - 4rem);
  }

  @include desktop {
    width: auto;
    padding-top: 0;
    margin-right: 2rem;
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
    z-index: 3;
    padding: 0 5.75rem;
  }

  @include desktop {
    display: block;
    padding-top: 1.125rem;
    text-align: left;
    min-height: 4.75rem;
    padding-left: $pagePaddingDesktop;
    padding-right: 2rem;
  }

  @include phone {
    padding: 0 4.75rem;
  }

  &.p-mini-header {
    @include desktop {
      min-height: 2.75rem;
    }
  }

  .c-toggle.sidebar,
  .c-toggle.chat {
    right: 0;

    @include desktop {
      display: none;
    }
  }
}

.p-title {
  display: flex;
  align-items: center;

  & > span {
    width: fit-content;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @include touch {
    max-width: 65vw;
  }
}

.c-logo {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 1rem;

  @include desktop {
    display: none;
  }
}

.p-sidebar {
  grid-area: p-sidebar;
  position: fixed;
  z-index: $zindex-sidebar;
  right: 0;
  width: $rightSideWidth;
  height: 100%;
  background-color: $general_2;
  transform: translateX(100%);
  transition: transform $transitionSpeed;

  &-inner {
    height: 100%;
    padding: 1.5rem 0.5rem 0.5rem 1.5rem;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  @include desktop {
    transform: translateX(0%);
  }

  .c-toggle {
    right: 100%;

    @include until($desktop) {
      display: none;
    }
  }

  &.is-active {
    transform: translateX(0);

    .c-toggle {
      height: 100%;
      display: block;
    }
  }
}
</style>
