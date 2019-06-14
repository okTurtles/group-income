<template lang="pug">
.c-chatnav
  template(slot='actions')
    // TODO design search results on mobile - MVP be same as desktop
    //
      <button class="button is-icon is-hidden-tablet">
      <i class="icon-search"></i>
      </button>
    menu-parent
      menu-trigger.is-icon
        i.icon-ellipsis-v
      // TODO be a drawer on mobile
      menu-content.c-actions-content
        ul
          menu-item(tag='button' itemid='hash-1' icon='heart')
            i18n Settings
          menu-item(tag='button' itemid='hash-2' icon='heart' hasdivider='')
            i18n Mute chat
          menu-item(tag='button' itemid='hash-3' icon='heart')
            i18n Report a problem

  input.input.c-chatnav-search(
    type='text'
    v-if='searchPlaceholder'
    :placeholder='searchPlaceholder'
    @keyup='handleSearch'
  )

  .c-chatnav-body
    template(v-if='ephemeral.isSearching')
      | Search results for &quot;{{ ephemeral.searchTerm }}&quot; to be done...
    slot(v-else='')
      // Content for each chatNav is up to the parent

</template>

<script>
import MainHeader from '../MainHeader.vue'
import { MenuParent, MenuTrigger, MenuContent, MenuItem } from '../Menu/index.js'

export default {
  name: 'ChatNav',
  components: {
    MainHeader,
    MenuParent,
    MenuTrigger,
    MenuContent,
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

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-chatnav {
  .c-actions-content {
    top: $spacer-lg;
    right: 0;
    left: auto;
    min-width: 10rem;
  }

  &-search {
    margin-top: $spacer;
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
      margin: $spacer $spacer-sm 0;
      width: calc(100% - #{$spacer});
    }
  }
}
</style>
