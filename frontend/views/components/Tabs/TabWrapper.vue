<template lang='pug'>
  .tab-wrapper
    .tab-nav-toggle(:class="{'open': open}" @click="open = !open")
    nav.tab-nav(:class="{'open': open}" @click="open = false")
      .tab-nav-list(v-for='(tabItem, index) in tabNav' :key='index')
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}
        hr.tab-nav-separator(v-else)

        a.tab-link.no-border(
          :class="{ 'tab-active': activeTab === tabItem.index, 'has-text-white': isDarkTheme}"
          v-for='(links, index) in tabItem.links'
          @click='tabClick(links)'
          :key='index'
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
      open: false
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

.tab-nav {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 35%;
  min-width: 190px;
  background-color: var(--primary-bg-s);
}

.tab-wrapper {
  display: flex;
  min-height: 100%;

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
  width: 175px;
  padding-right: 7px;

  &:first-child .tab-legend {
    margin-top: 2px;
    margin-bottom: 0;
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
  background: #b2c3ca;
  height: 1px;
}

.tab-item {
  box-sizing: border-box;
  height: 100%;
}

.tab-section {
  width: 65%;
  background-color: #fff;
}

@include phone {
  .title {
    margin: 14px 0 24px 40px;
  }

  .tab-nav-toggle {
    position: absolute;
    top: 25px;
    left: 12px;
    z-index: 30;
    height: 40px;
    width: 40px;
    background-color: var(--bg-color);
    border-radius: 50%;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 15px;
      left: 14px;
      width: 12px;
      height: 2.5px;
      background: var(--action-color);
      transition: all 0.3s ease-out;
      transform-origin: 50%;
    }

    &::after {
      top: 22px;
    }

    &:hover {
      &::before,
      &::after {
        transform: rotate(180deg);
      }
    }

    &.open {
      background-color: $closeMobileBgColor;

      &::before,
      &::after {
        background-color: $closeMobileBarBgColor;
        transform: rotate(90deg);
      }
    }
  }

  .tab-wrapper {
    display: block;
  }

  .tab-nav {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 20;
    width: 100%;
    padding-top: 62px;
    padding-left: 24px;
    align-items: flex-start;
    transition: transform 150ms cubic-bezier(0.4, 0.25, 0.3, 1);
    transform: translateX(-100%);

    &.open {
      transform: translateX(0);
    }
  }

  .tab-section {
    width: 100%;
  }
}
</style>
