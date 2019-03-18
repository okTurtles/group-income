<template lang='pug'>
  .tab-wrapper
    .tab-nav-toggle(:class="{'open': open}" @click="open = !open")
    nav.tab-nav(:class="{'open': open}" @click="open = false")
      .tab-nav-list(v-for='(tabItem, index) in tabNav' :key='index')
        legend.tab-legend(v-if='tabItem.legend') {{ tabItem.legend }}
        hr.tab-nav-separator(v-else)

        a.tab-link(
          :class="{ 'tab-active': activeTab === tabItem.index}"
          v-for='(tabItem) in tabItem.links'
          @click='tabClick(tabItem.index)'
          :key='tabItem.index'
        ) {{ tabItem.title }}

    section.tab-section
      slot

</template>

<script>
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

  watch: {
      /**
       * When v-model is changed set the new active tab.
       */
      value(value) {
        this.changeTab(value)
      },
      /**
       * When tab-items are updated, set active one.
       */
      tabItems() {
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
     * Tab click listener, emit input event and change active tab.
     */
    tabClick(value) {
      this.$emit('input', value)
      this.changeTab(value)
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

$separatorColor: #B2C3CA;
$legendColor: #7B7B7B;
$activeColor: #fff;
$closeMobileBgColor: #000;
$closeMobileBarBgColor: #3C3C3C;

.tab-nav{
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 35%;
  min-width: 190px;
  background-color: var(--nav-color);
}

.tab-wrapper {
  display: flex;
  min-height: 100%;

  > * div {
    padding-top: 15px;
  }
}

.tab-nav-list {
  display: flex;
  flex-direction: column;
  width: 175px;
  padding-right: 7px;
  font-size: 1.4rem;

  &:first-child .tab-legend {
    margin-top: 2px;
    margin-bottom: 0;
  }
}

.tab-legend {
  text-transform: uppercase;
  letter-spacing: .1px;
  color: $legendColor;
}

.tab-legend,
.tab-link {
  padding: 7px 8px 7px 8px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: padding-left 150ms cubic-bezier(0.4, 0.25, 0.3, 1), background-color 150ms cubic-bezier(0.4, 0.25, 0.3, 1);
}

.tab-link:hover,
.tab-active {
  border-radius: 2px;
  background-color: var(--main-color);
  font-weight: bold;
  color: $activeColor;
}

.tab-link:hover {
  padding-left: 15px;
  background-color: var(--main-hexa);
}

.tab-nav-separator {
  margin: -1px 24px 15px 8px;
  padding: 0;
  border-top: 1px solid $separatorColor;
  border-bottom: 0;
}

.tab-item {
  box-sizing: border-box;
  height: 100%;
}

.tab-section {
  width: 65%;
}

@include tablet {
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
      content: '';
      position: absolute;
      top: 15px;
      left: 14px;
      width: 12px;
      height: 2.5px;
      background: var(--action-color);
      transition: all .3s ease-out;
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