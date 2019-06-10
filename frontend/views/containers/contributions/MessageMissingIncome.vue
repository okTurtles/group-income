<template lang="pug">
div(v-on='$listeners')
  .is-flex.c-header
    i.icon-plus.is-flex.c-icon
    i18n.title.is-5(tag='h2') Add Income Details

  i18n.has-text-light(tag='p') Sharing a few income details helps ensure all group members meet the mincome.

  p.error
    i.c-icon-attention
    i18n This information is required for you to be able to be part of the group.

</template>
<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-box {
  padding: $spacer;
}

.c-header {
  align-items: center;
}

.c-icon {
  background: $primary-bg-a;
  width: 2rem;
  height: 2rem;
  margin-right: $spacer-sm;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: $primary;
}

.c-info {
  margin: $spacer 0;
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
