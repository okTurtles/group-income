<template lang="pug">
.c-loading-page
  .skeleton.is-heading
  .skeleton.is-sub-heading.mb-2

  .c-para-skeletons.mb-2
    .skeleton.is-paragraph
    .skeleton.is-paragraph
    .skeleton.is-paragraph

  .skeleton.is-sub-heading

  .c-card-container.mb-2
    .skeleton.is-card
      .skeleton.is-heading.mb-2
      .skeleton.is-paragraph
      .skeleton.is-paragraph
      .skeleton.is-paragraph

    .skeleton.is-card
      .skeleton.is-heading.mb-2
      .skeleton.is-paragraph
      .skeleton.is-paragraph
      .skeleton.is-paragraph
</template>

<script>
export default {
  name: 'Loading'
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-loading-page {
  position: relative;
  padding: 1.5rem 2.5rem;

  @include phone {
    padding: 1.5rem 1rem;
  }
}

.c-para-skeletons {
  position: relative;
  max-width: 36.5rem;
}

.c-card-container {
  display: flex;
  gap: 1.75rem;
  flex-wrap: wrap;
}
</style>
