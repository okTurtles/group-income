<template lang='pug'>
  .tab-wrapper(:class="{'open': open}")
    .tab-nav-header
      button.is-icon.tab-back(
        aria-label='back'
        @click='open = !open'
      )
        i.icon-chevron-left(aria-hidden='true')

      h1.tab-title
        i18n.menu-title Settings
        i18n.main-title {{ title }}

    nav.tab-nav-sidebar(
      aria-label='navigation'
      @click='open = false'
    )
      .tab-nav-list(
        v-for='(tabItem, index) in tabNav'
        :key='index'
      )
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}
        hr.tab-nav-separator(v-else)

        a.tab-link.no-border(
          v-for='(links, index) in tabItem.links'
          :key='index'
          :class="{ 'tab-active': activeTab === links.index, 'has-text-white': isDarkTheme}"
          :data-test='`link-${links.url}`'
          @click='tabClick(links)'
        ) {{ links.title }}

    section.tab-section
      slot
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CLOSE_MODAL } from '~/frontend/utils/events.js'

export default {
  name: 'TabWrapper',

  props: {
    value: Number,
    tabNav: Array
  },

  data () {
    return {
      activeTab: this.value || 0,
      tabItems: [],
      open: true,
      title: this.tabNav[0].links[0].title || ''
    }
  },

  computed: {
    ...mapGetters([
      'isDarkTheme'
    ])
  },

  watch: {
    /**
     * When v-model is changed set the new active tab.
     */
    value (value) {
      this.changeTab(value)
    },
    /**
     * When tab-items are updated, set active one.
     */
    tabItems () {
      if (this.tabItems.length) {
        this.tabItems[this.activeTab].isActive = true
      }
    }
  },

  methods: {
    /**
     * Change the active tab and emit change event.
     */
    changeTab (newIndex) {
      if (this.activeTab === newIndex) return
      this.tabItems[this.activeTab].deactivate(this.activeTab, newIndex)
      this.tabItems[newIndex].activate(this.activeTab, newIndex)
      this.activeTab = newIndex
      this.$emit('change', newIndex)
    },
    /**
     * Tab click listener change active tab.
     */
    tabClick (tabItem) {
      this.title = tabItem.title
      if (tabItem.index !== undefined) {
        const query = {
          ...this.$route.query,
          section: tabItem.url
        }
        this.$router.push({ query: query })
        this.changeTab(tabItem.index)
      } else {
        this.$store.dispatch(tabItem.action)
        sbp('okTurtles.events/emit', CLOSE_MODAL)
      }
    }
  },

  mounted () {
    if (this.$route.query.section) {
      this.tabNav.forEach(item => {
        item.links.forEach(link => {
          if (this.$route.query.section === link.url) {
            this.activeTab = link.index
            this.title = link.title
          }
        })
      })
    }

    if (this.tabItems.length) {
      this.tabItems[this.activeTab].isActive = true
    }
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/style/_variables.scss";

$separatorColor: #b2c3ca;
$legendColor: #7b7b7b;
$activeColor: #fff;
$closeMobileBgColor: #000;
$closeMobileBarBgColor: #3c3c3c;

// Page wrapper
.tab-wrapper {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas:
    "header header"
    "main main";
  min-height: 100%;
  background-color: #fff;

  @include tablet {
    grid-template-columns: 35% auto;
    grid-template-areas:
      "sidebar header"
      "sidebar main";
  }

  @media screen and (min-width: 769px) and (max-width: 900px) {
    grid-template-columns: 200px 1fr;
  }
}

// Header
.tab-nav-header {
  grid-area: header;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 3;
  background-color: var(--primary);

  @include tablet {
    justify-content: start;
    background-color: transparent;
  }
}

.menu-title {
  display: none;
}

.main-title {
  @include tablet {
    display: none;
  }
}

.tab-title {
  font-weight: bold;
  font-size: 0.875rem;

  @include tablet {
    margin: 16px 0 0 27px;
    font-size: 1.5rem;
  }
}

.tab-back {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1;
  height: 2rem;
  width: 2rem;

  &:focus,
  &:hover {
    background: transparent;
  }

  @include tablet {
    display: none;
  }
}

// Sidebar
.tab-nav-sidebar {
  grid-area: main;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  transition: transform 500ms cubic-bezier(0.165, 0.84, 0.44, 1);
  transform: translateX(-100%);
  z-index: 2;
  background-color: #fff;

  @include tablet {
    grid-area: sidebar;
    background-color: var(--primary);
    position: relative;
    align-items: flex-end;
    padding-top: 0;
    transform: translateX(0);
  }
}

.tab-legend {
  height: 2rem;
  color: $legendColor;
  font-size: 12px;
  letter-spacing: 0.2px;
  text-transform: uppercase;

  @include tablet {
    height: 38px;
    letter-spacing: 0.1px;
  }
}

.tab-link {
  display: flex;
  justify-content: space-between;
  letter-spacing: -0.4px;
  height: 44px;
  @include tablet {
    height: 32px;
  }

  .fa {
    color: #dbdbdb;
    font-size: 15px;
    margin-top: -2px;

    @include tablet {
      display: none;
    }
  }
}

.tab-legend,
.tab-link {
  display: flex;
  align-items: center;
  padding-left: 8px;
  padding-right: 8px;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 150ms cubic-bezier(0.4, 0.25, 0.3, 1);

  @include tablet {
    margin-right: 4px;
  }
}

.tab-nav-list {
  display: flex;
  flex-direction: column;
  width: 456px;
  max-width: calc(100% - 1rem);
  padding: 16px 4px 6px 0;

  @include tablet {
    width: 183px;
    padding-top: 14px;
    padding-bottom: 0;
  }
}

.tab-link:hover {
  background-color: $primary_2;
}

.tab-active {
  background-color: $primary_0 !important;
  font-weight: bold;
  color: $activeColor;
}

.tab-nav-separator {
  height: 1px;
  margin: 4px auto;
  background: #b2c3ca;
  opacity: 0;

  @include tablet {
    opacity: 1;
    margin: 3px 28px 9px 8px;
    margin-bottom: 1rem;
  }
}

.tab-item {
  height: 100%;
  display: flex;
  justify-content: center;

  @include tablet {
    justify-content: start;
  }
}

// Main content
.tab-section {
  grid-area: main;
  transition: transform 500ms cubic-bezier(0.165, 0.84, 0.44, 1);
  transform: translateX(0%);
}

// Open state
.open {
  .tab-nav-sidebar {
    transform: translateX(0);
  }

  .tab-back {
    opacity: 0;
  }

  .menu-title {
    display: block;

    @include tablet {
      display: none;
    }
  }

  .main-title {
    display: none;
  }

  .tab-section {
    transform: translateX(10%);

    @include tablet {
      transform: translateX(0);
    }
  }
}

</style>
