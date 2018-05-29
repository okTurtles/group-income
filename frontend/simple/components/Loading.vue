<template>
  <div class="gi-loading has-text-centered"
    :class="{ fullView: theme === 'fullView' }">
    <h1 class="title is-3 is-marginless"><i18n>{{title}}</i18n></h1>
    <p><i18n>{{text}}</i18n></p>
  </div>
</template>
<style lang="scss" scoped>
@import "../assets/sass/theme/index";
@import "../assets/sass/bulma_overrides/components/navbar";

.gi-loading {
  opacity: 0;
  padding: $gi-spacer-lg 0;
  animation: show 200ms 500ms forwards;

  &.fullView {
    min-height: calc(100vh - #{$navbar-height});
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

@keyframes show {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
<script>
export default {
  name: 'Loading',
  props: {
    title: {
      default: 'Hang in there',
      type: String
    },
    text: {
      default: 'Magic is happening...',
      type: [String, Number]
    },
    theme: {
      validator (value) {
        return ['fullView', ''].indexOf(value) !== -1
      }
    }
  }
}
</script>
