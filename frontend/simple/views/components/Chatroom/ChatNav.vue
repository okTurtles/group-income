<template>
  <div class="c-chatnav is-flex">
    <h1 class="title is-4 is-marginless c-title">{{title}}</h1>
    <div class="c-scrollable">
      <slot></slot>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatnav {
  flex-direction: column;
  width: 14rem;
  min-width: 14rem;
  border-right: 1px solid $grey-lighter;
}

.c-title {
  position: relative;
  padding: $gi-spacer $gi-spacer-sm;
  z-index: 2;

  // fadeOutTop: a gradient mask to fadeout nav on scroll.
  // TODO - apply the same effect on sidebar
  &::after {
    content: "";
    position: absolute;
    bottom: -$gi-spacer-sm;
    left: 0;
    height: $gi-spacer-sm;
    width: 100%;
    background: linear-gradient($body-background-color, rgba($body-background-color, 0));
  }
}

.c-scrollable {
  padding: $gi-spacer-sm;
  overflow: auto;
}
</style>
<script>
export default {
  name: 'ChatNav',
  components: {},
  props: {
    title: String
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
