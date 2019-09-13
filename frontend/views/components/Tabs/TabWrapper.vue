<template lang='pug'>
  .tab-wrapper(:class="{'open': open}")
    nav.tab-nav-sidebar(
      aria-label='navigation'
      @click='open = false'
    )
      .tab-nav-header
        i18n.menu-title(tag='h2') Settings

      .tab-nav-list(
        v-for='(tabItem, index) in tabNav'
        :key='index'
      )
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}
        hr.tab-nav-separator(v-else)

        a.tab-link.no-border(
          v-for='(links, index) in tabItem.links'
          :key='index'
          :class='{ "tab-active": activeTab === links.index, "has-text-white": isDarkTheme}'
          :data-test='`link-${links.url}`'
          @click='tabClick(links)'
        )
          | {{ links.title }}
          .c-icons
            i.icon-chevron-right

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
      const transition = this.activeTab < newIndex
        ? 'slide-next'
        : 'slide-prev'
      this.tabItems[this.activeTab].changeTab(false, transition)
      this.tabItems[newIndex].changeTab(true, transition)
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
        sbp('state/vuex/dispatch', tabItem.action)
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
  position: relative;
  z-index: 4; // Hide close button on mobile
  display: flex;
  height: 100%;
  overflow: hidden;
  background-color: $general_2;

  @include tablet {
    z-index: 2;
  }
}

// Header
.tab-nav-header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
  height: 4.75rem;
  background-color: $background;

  @include tablet {
    display: none;
  }
}

// Sidebar
.tab-nav-sidebar {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: 100%;
  transition: transform 500ms cubic-bezier(0.165, 0.84, 0.44, 1);
  transform: translateX(-100%);
  z-index: 2;
  font-family: "Poppins";
  background-color: $general_2;

  @include tablet {
    position: relative;
    align-items: flex-end;
    width: 35%;
    transform: translateX(0);
  }

  @media screen and (min-width: 769px) and (max-width: 900px) {
    width: 200px;
  }
}

.tab-legend {
  color: $legendColor;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: $spacer-sm;

  @include tablet {
    letter-spacing: 0.1px;
  }
}

.tab-link {
  display: flex;
  justify-content: space-between;
  height: 3rem;

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
  padding-left: $spacer;
  padding-right: $spacer;
  border-radius: 3px;
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
  padding-top: 1.5rem;
  padding-bottom: 6px;

  @include tablet {
    width: 183px;
    padding-top: 3rem;
    padding-bottom: 0;
  }
}

.tab-link:hover {
  background-color: $general_1;
}

.tab-active {
  background-color: $background_0;
  font-weight: bold;
}

.tab-nav-separator {
  height: 1px;
  margin: 4px auto;
  background: $general_0;
  opacity: 0;

  @include tablet {
    opacity: 1;
    margin: 3px 28px 9px 8px;
    margin-bottom: 1rem;
  }
}

// Main content
.tab-section {
  transition: transform 500ms cubic-bezier(0.165, 0.84, 0.44, 1);
  transform: translateX(0%);
  overflow: auto;
  width: 100%;
}

// Open state
.open {
  z-index: 2; // Show close button on mobile
  .tab-nav-sidebar {
    transform: translateX(0);
  }

  .tab-section {
    transform: translateX(10%);

    @include tablet {
      transform: translateX(0);
    }
  }
}

</style>
