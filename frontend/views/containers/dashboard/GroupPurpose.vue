<template lang='pug'>
.c-group-purpose
  .c-group-purpose-header
    i18n.is-title-4(tag='h3') About the group
    router-link.button.is-small.is-outlined(
      v-if='!groupSettings.sharedValues'
      to='/group-settings'
    )
      i.icon-plus.is-prefix
      i18n Add

  div(v-if='groupSettings.sharedValues')
    p.c-text.has-text-1(data-test='sharedValues')
      | {{ groupSettings.sharedValues }}

    router-link.link(
      to='/group-settings'
    )
      i18n Edit

  slot
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'GroupPurpose',
  computed: {
    ...mapGetters([
      'groupSettings'
    ])
  },
  methods: {
    updateSharedValues () {
      // TODO
      console.log('Open shared value form')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-group-purpose-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.c-group-purpose {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  position: relative;
}

.c-text {
  margin: 0.5rem 0;
}
</style>
