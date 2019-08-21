<template lang="pug">
.c-group-purpose
  .c-group-purpose-header
    i18n.title.is-4(tag='h4') About the group

  p.c-text.has-text-1(data-test='sharedValues')
    | {{ groupSettings.sharedValues }}

  i18n.link(
    tag='button'
    @click='updateSharedValues'
  ) Edit
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'GroupMembers',
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
@import "../../../assets/style/_variables.scss";

.c-group-purpose {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  position: relative;
}

.c-text {
  margin: $spacer-sm 0;
}
</style>
