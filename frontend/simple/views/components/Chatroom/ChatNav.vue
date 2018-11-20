<template>
  <div class="c-chatnav">
    <main-header :title="title">
      <template slot="actions">
        <!-- TODO design search results on mobile - MVP be same as desktop -->
        <!-- <button class="button is-icon is-hidden-tablet">
          <i class="fa fa-search"></i>
        </button> -->
        <menu-parent class="level-right">
          <menu-trigger class="is-icon">
            <i class="fa fa-ellipsis-v"></i>
          </menu-trigger>

          <!-- TODO be a drawer on mobile -->
          <menu-content class="c-actions-content">
            <list hasMargin>
              <menu-item tag="button" itemId="hash-1" icon="heart">
                <i18n>Settings</i18n>
              </menu-item>
              <menu-item tag="button" itemId="hash-2" icon="heart" hasDivider>
                <i18n>Mute chat</i18n>
              </menu-item>
              <menu-item tag="button" itemId="hash-3" icon="heart">
                <i18n>Report a problem</i18n>
              </menu-item>
            </list>
          </menu-content>
        </menu-parent>
      </template>

      <input class="input c-chatnav-search" type="text"
        v-if="searchPlaceholder"
        :placeholder="searchPlaceholder"
        @keyup="handleSearch" />
    </main-header>
    <div class="c-chatnav-body">
      <template v-if="ephemeral.isSearching">
        Search results for "{{ ephemeral.searchTerm }}" to be done...
      </template>
      <slot v-else><!-- Content for each chatNav is up to the parent --></slot>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatnav {
  display: flex;
  flex-direction: column;
  width: 15rem;
  border-right: 1px solid $grey-lighter;

  .c-actions-content {
    top: $gi-spacer-lg;
    right: 0;
    left: auto;
    width: 10rem;
  }

  &-search {
    margin-top: $gi-spacer;
  }

  &-body {
    overflow: auto;
    padding: $gi-spacer-sm;
  }
}

@include phone {
  .c-chatnav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    max-height: 100vh;
    overflow: auto;

    &-search {
      margin: $gi-spacer $gi-spacer-sm 0;
      width: calc(100% - #{$gi-spacer});
    }

    &-body {
      padding-top: 8rem; // header + search
      padding-bottom: $gi-spacer-lg;
    }
  }
}
</style>
<script>
import MainHeader from '../MainHeader.vue'
import { List } from '../Lists/index.js'
import { MenuParent, MenuTrigger, MenuContent, MenuHeader, MenuItem } from '../Menu/index.js'

export default {
  name: 'ChatNav',
  components: {
    MainHeader,
    List,
    MenuParent,
    MenuTrigger,
    MenuContent,
    MenuHeader,
    MenuItem
  },
  props: {
    title: String,
    searchPlaceholder: String
  },
  data () {
    return {
      ephemeral: {
        isSearching: false,
        searchTerm: null
      }
    }
  },
  computed: {},
  methods: {
    handleSearch (e) {
      if (!e.target.value) {
        this.ephemeral.isSearching = false
      } else {
        console.log('TODO $store - search results...')
        this.ephemeral.isSearching = true
      }
      this.ephemeral.searchTerm = e.target.value
    }
  }
}
</script>
