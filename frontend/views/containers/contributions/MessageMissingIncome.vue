<template lang='pug'>
div(v-on='$listeners')
  .c-header
    button.is-small.is-outlined
      i.icon-plus
      i18n Add Income Details

  i18n.has-text-1(tag='p') Sharing a few income details helps ensure all group members meet the mincome.

  p.error
    i.c-icon-attention
    i18n This information is required for you to be able to be part of the group.
</template>
<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-header {
  margin-top: $spacer;
}

.c-icon-attention {
  margin-right: $spacer-sm;
}
</style>
<script>
export default {
  // NOTE: When something similar to this box is needed again
  // consider adding props, move to components/ and reuse this componet.
  name: 'MessageMissingIncome'
}
</script>
