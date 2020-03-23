<template lang='pug'>
  .tab-wrapper(:class='{"open": open}')
    nav.tab-nav-sidebar(
      aria-label='navigation'
      @click='open = false'
    )
      .tab-nav-header
        i18n.is-title-2.menu-title(tag='h2') Settings

      .tab-nav-list(
        v-for='(tabItem, index) in tabNav'
        :key='index'
      )
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}
        hr.tab-nav-separator(v-else)

        a.tab-link.no-border(
          v-for='(link, index) in tabItem.links'
          :key='index'
          :class='{ "is-active": activeTab === link.index, "has-text-white": isDarkTheme}'
          :data-test='`link-${link.url}`'
          @click='tabClick(link)'
        )
          | {{ link.title }}
          .c-icons
            i.icon-chevron-right

    section.tab-section
      slot
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'

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
    },
    '$route' (to, from) {
      const section = to.query.section
      if (!section) return

      let foundTheTab = false
      for (const tabItem of this.tabNav) {
        for (const link of tabItem.links) {
          if (this.activeTab !== link.index && link.url === section) {
            this.changeTab(link.index)
            foundTheTab = true
            break
          }
        }
        if (foundTheTab) break
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
        this.$router.push({ query })
        this.changeTab(tabItem.index)
      } else {
        sbp('state/vuex/dispatch', tabItem.action)
        this.$emit('close')
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
@import "@assets/style/_variables.scss";

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

  @include desktop {
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
  min-height: 4.75rem;
  background-color: $background;

  @include tablet {
    min-height: 5.75rem;
  }

  @include desktop {
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

  @include desktop {
    position: relative;
    align-items: flex-end;
    width: 35%;
    transform: translateX(0);
  }
}

.tab-legend {
  color: $legendColor;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: $spacer-sm;

  @include desktop {
    letter-spacing: 0.1px;
  }
}

.tab-link {
  display: flex;
  justify-content: space-between;
  height: 3rem;
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
}

.c-icons {
  color: $text_1;

  @include desktop {
    display: none;
  }
}

.tab-nav-list {
  display: flex;
  flex-direction: column;
  width: 28rem;
  max-width: calc(100% - 1rem);
  padding-top: 1.5rem;

  @include desktop {
    width: 11rem;
  }
}

.tab-nav-header + .tab-nav-list {
  padding-top: 3rem;
}

.tab-link:hover {
  background-color: $general_1;
}

.is-active {
  @include desktop {
    background-color: $background_0;
    font-weight: bold;
  }
}

.tab-nav-separator {
  height: 1px;
  margin: -0.5rem 1rem 1rem;
  background: $general_0;

  @include desktop {
    margin-right: 0;
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

    @include desktop {
      transform: translateX(0);
    }
  }
}

</style>
