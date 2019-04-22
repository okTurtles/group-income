<template lang='pug'>
  .tab-wrapper
    .tab-nav-header
      button.button.is-icon.tab-back(
        :aria-label='back'
        :class="{'open': open}"
        @click='open = !open'
      )
        i.fa.fa-chevron-left(aria-hidden='true')

    nav.tab-nav(:class="{'open': open}" @click="open = false")
      .tab-nav-list(v-for='(tabItem, index) in tabNav' :key='index')
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}
        hr.tab-nav-separator(v-else)

        a.tab-link.no-border(
          :class="{ 'tab-active': activeTab === tabItem.index, 'has-text-white': isDarkTheme}"
          v-for='(links, index) in tabItem.links'
          @click='tabClick(links)'
          :key='index'
        )
          | {{ links.title }}
          i.fa.fa-chevron-right(aria-hidden='true')

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
      open: true
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
      if (tabItem.index !== undefined) {
        this.changeTab(tabItem.index)
      } else {
        this.$store.dispatch(tabItem.action)
        sbp('okTurtles.events/emit', CLOSE_MODAL)
      }
    }
  },

  mounted () {
    if (this.tabItems.length) {
      this.tabItems[this.activeTab].isActive = true
    }
  }
}
</script>

<style lang='scss' scoped>
@import "../../../assets/sass/theme/index";

$separatorColor: #b2c3ca;
$legendColor: #7b7b7b;
$activeColor: #fff;
$closeMobileBgColor: #000;
$closeMobileBarBgColor: #3c3c3c;

.tab-nav-header {
  position: relative;
  z-index: 3;
  height: 65px;
  width: 100%;
  background-color: var(--primary-bg-s);

  @include tablet {
    display: none;
  }
}

.tab-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  padding-top: 62px;
  transition: transform 150ms cubic-bezier(0.4, 0.25, 0.3, 1);
  transform: translateX(-100%);
  z-index: 2;
  background-color: #fff;

  &.open {
    transform: translateX(0);
  }

  @include tablet {
    min-width: 190px;
    width: 35%;
    background-color: var(--primary-bg-s);
    position: relative;
    align-items: flex-end;
    padding-top: 0;
    transform: translateX(0);
  }
}

.tab-back {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1;
  height: 32px;
  width: 32px;

  &:focus,
  &:hover {
    background: transparent;
  }

  &.open {
    opacity: 0;
  }
}

.tab-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;

  @include tablet {
    flex-direction: row;
  }

  > * div {
    padding-top: 15px;
  }
}

.tab-legend {
  text-transform: uppercase;
  letter-spacing: 0.1px;
  color: $legendColor;
}

.tab-link {
  color: #363636;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @include tablet {
    .fa {
      display: none;
      color: #DBDBDB;
    }
  }
}

.tab-legend,
.tab-link {
  padding: 7px 8px 7px 8px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: padding-left 150ms cubic-bezier(0.4, 0.25, 0.3, 1), background-color 150ms cubic-bezier(0.4, 0.25, 0.3, 1);
}

.tab-nav-list {
  display: flex;
  flex-direction: column;
  padding-right: 7px;
  width: 456px;

  &:first-child .tab-legend {
    margin-top: 2px;
    margin-bottom: 0;
  }

  @include tablet {
    width: 175px;
  }
}

.tab-active {
  background-color: $primary;
  font-weight: bold;
  color: $activeColor;
}

.tab-link:hover,
.tab-active {
  border-radius: 2px;
}

.tab-link:hover {
  padding-left: 15px;
  background-color: $primary-bg-a;
}

.tab-nav-separator {
  margin: -1px 24px 15px 8px;
  padding: 0;
  height: 1px;
  background: #b2c3ca;
  opacity: 0;

  @include tablet {
    opacity: 1;
  }
}

.tab-item {
  box-sizing: border-box;
  height: 100%;
  display: flex;
  justify-content: center;

  @include tablet {
    justify-content: start;
  }
}

.tab-section {
  width: 100%;
  background-color: #fff;
  flex: 1;

  @include tablet {
    width: 65%;
  }
}

</style>
