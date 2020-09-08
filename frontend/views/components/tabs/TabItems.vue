<template lang='pug'>
  .tab-item
    .tab-header
      button.is-icon.tab-back.has-background(
        aria-label='back'
        @click='$parent.open = !$parent.open'
      )
        i.icon-chevron-left(aria-hidden='true')

      transition(:name='$parent.transitionName' mode='out-in')
        h2.is-title-2.main-title(:key='$parent.title') {{ $parent.title }}

    .tab-body
      transition(:name='$parent.transitionName' mode='out-in')
        component(v-bind:is='$parent.activeComponent')
</template>

<script>
export default {
  name: 'TabItem'
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

// Header
.tab-header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: sticky;
  top: 0;
  height: 4.75rem;
  width: 100%;
  z-index: 3;
  background-color: $background;

  @include desktop {
    justify-content: start;
    background-color: transparent;
    position: relative;
  }
}

.main-title {
  @include desktop {
    margin: 2.5rem 0 0 27px;
  }
}

.tab-back {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1;

  @include desktop {
    display: none;
  }
}

.tab-body {
  display: flex;
  justify-content: center;
  padding: 1.5rem 1.5rem 0 1.5rem;

  @include desktop {
    justify-content: flex-start;
    padding-top: 0;
    max-width: 43rem;
  }
}
</style>
