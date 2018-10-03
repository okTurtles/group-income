<template>
  <div class="box is-unfilled c-box" v-on="$listeners">
    <div class="is-flex c-header">
      <i class="fa fa-plus is-flex c-icon"></i>
      <i18n tag="h2" class="title is-5">Add Income Details</i18n>
    </div>
    <i18n tag="p" class="c-info">A clear text explaining why this information is needed, so the user understands and feels comfortable about providing this information.</i18n>

    <div class="has-text-danger has-text-weight-bold">
      <i class="c-icon-attention fa fa-exclamation-triangle"></i>
      <i18n>This information is required for you to be able to be part of the group.</i18n>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-box {
  padding: $gi-spacer;
}

.c-header {
  align-items: center;
}

.c-icon {
  background: $primary-bg-a;
  width: 2rem;
  height: 2rem;
  margin-right: $gi-spacer-sm;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: $primary;
}

.c-info {
  margin: $gi-spacer 0;
}

.c-icon-attention {
  margin-right: $gi-spacer-sm;
}
</style>
<script>
export default {
  // NOTE: When something similar to this box is needed again
  // consider adding props, move to components/ and reuse it.
  name: 'MessageMissingIncome'
}
</script>
