<template>
  <div class="c-chatnav">
    <h1 class="title is-4">{{title}}</h1>
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatnav {
  padding: $gi-spacer $gi-spacer-sm;
  width: 14rem;
  border-right: 1px solid $grey-lighter;
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
