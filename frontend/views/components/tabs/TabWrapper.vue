<template lang='pug'>
  .tab-wrapper(:class='{"open": open}')
    nav.tab-nav-sidebar(aria-label='navigation')
      .tab-nav-header
        i18n.is-title-2.menu-title(tag='h2') Settings

      .tab-nav-list(
        v-for='(tabItem, index) in tabNav'
        :key='index'
      )
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}

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

        hr.tab-nav-separator

      .tab-nav-list.is-subtitle(
        v-for='(tabItem, index) in subNav'
        :key='"sub-" + index'
        :class='{ "sublink": tabItem.url }'
        :data-test='`link-${tabItem.url}`'
        @click='tabClick(tabItem)'
      )
        span(v-if='tabItem.html' v-safe-html='tabItem.html')
        span(v-else)  {{ tabItem.title }}

    section.tab-section
      tab-item
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import TabItem from '@components/tabs/TabItem.vue'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'
import { L, LTags } from '@common/common.js'

export default ({
  name: 'TabWrapper',
  components: {
    TabItem
  },
  props: {
    tabNav: Array,
    defaultTab: String // initial tab name
  },
  data () {
    return {
      activeTab: 0,
      activeComponent: null,
      title: '',
      transitionName: '',
      open: true,
      subNav: [
        { html: '' }, // this will get filled in `mounted()` below
        {
          title: L('Acknowledgements'),
          url: 'acknowledgements',
          component: 'Acknowledgements',
          index: 11 // NOTE: index should not be duplicated with the link of tabNav
        }
      ]
    }
  },
  computed: {
    ...mapGetters([
      'isDarkTheme'
    ])
  },
  watch: {
    '$route' (to, from) {
      const tab = to.query.tab
      if (!tab) return

      for (const tabItem of this.tabNav) {
        for (const link of tabItem.links) {
          if (this.activeTab !== link.index && link.url === tab) {
            this.activeComponent = link.component
            return this.changeTab(link.index)
          }
        }
      }
    }
  },
  methods: {
    /**
     * Change the active tab.
     */
    changeTab (newIndex) {
      if (this.activeTab === newIndex) return
      this.transitionName = this.activeTab < newIndex
        ? 'slide-next'
        : 'slide-prev'
      this.activeTab = newIndex
    },
    /**
     * Tab click listener change active tab.
     */
    async tabClick (tabItem) {
      if (!tabItem.url) {
        return
      }
      this.title = tabItem.title
      this.activeComponent = tabItem.component
      this.open = false
      if (tabItem.index !== undefined) {
        const query = {
          ...this.$route.query,
          tab: tabItem.url
        }
        this.$router.push({ query }).catch(logExceptNavigationDuplicated)
        this.changeTab(tabItem.index)
      } else {
        // The action could be asynchronous, so we wrap it in a try-catch block
        try {
          await sbp(tabItem.action)
          this.$emit('close')
        } catch (e) {
          console.error(`Error on tabClick: [${e?.name}] ${e?.message || e}`, tabItem, e)
          alert(`An error occurred: ${e?.name}`)
        }
      }
    }
  },
  mounted () {
    const defaultTab = this.$route.query.tab || this.defaultTab
    if (defaultTab) {
      const switchTabIfMatch = (link) => {
        if (defaultTab === link.url) {
          this.activeTab = link.index
          this.title = link.title
          this.activeComponent = link.component
          this.open = false
        }
      }
      const allTabNavLinks = this.tabNav.reduce(
        (allLinks, item) => [...allLinks, ...item.links], []
      )
      // 'fallbackLink' below is for the case where the specified tab route query doesn't match any available tab items in the list. (e.g. ?modal=UserSettings&tab=asdfsadf)
      // we need to manually direct it to the 'my-account' tab in this case.
      const fallbackLink = allTabNavLinks.find(item => item.url === 'my-account')

      allTabNavLinks.forEach(item => {
        switchTabIfMatch(item)
      })
      this.subNav.forEach(navItem => {
        switchTabIfMatch(navItem)
      })

      if (!this.activeComponent) {
        // if still no matching link is found, fallback to 'my-account' tab.
        this.tabClick(fallbackLink)
      }
    }

    ;(async () => {
      const appVersion = process.env.GI_VERSION.split('@')[0]
      const contractsVersion = process.env.CONTRACTS_VERSION
      let swVer: string = ''
      try {
        swVer = (await sbp('sw/version')).GI_GIT_VERSION.slice(1)
      } catch (e) {
        swVer = `ERR: ${e.message}`
      }
      this.subNav[0].html = L('App Version: {appVersion}{br_}Contracts Version: {contractsVersion}{br_}SW Version: {swVer}', {
        ...LTags(),
        appVersion,
        contractsVersion,
        swVer
      })
    })()
  },
  beforeDestroy () {
    this.$router.push(this.$route.query).catch(logExceptNavigationDuplicated)
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

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
  overflow: hidden auto;

  @include desktop {
    position: relative;
    align-items: flex-end;
    width: 35%;
    transform: translateX(0);
  }
}

.tab-legend {
  color: $text_1;
  font-size: $size_5;
  text-transform: uppercase;
  margin-bottom: 0.5rem;

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
  padding-left: 1rem;
  padding-right: 1rem;
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

.tab-nav-list.is-subtitle {
  padding-top: 1rem;
  padding-left: 1rem;
  text-transform: unset;
  font-family: "Lato";
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
  margin: 1rem 1rem 0;
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
    // transform: translateX(10%);

    @include desktop {
      transform: translateX(0);
    }
  }
}
</style>
