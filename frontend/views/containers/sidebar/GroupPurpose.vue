<template lang="pug">
.c-group-purpose
  .c-group-purpose-header
    label.label
      i18n About the group

  p(data-test='sharedValues')
    | {{ currentGroupState.sharedValues }}

  button.link(@click'updateSharedValues')
    i18n Edit

</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'GroupMembers',
  computed: {
    ...mapGetters([
      'currentGroupState'
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

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -1.5rem;
    right: -1.5rem;
    height: 1px;
    background-color: $border;
  }
}
</style>
