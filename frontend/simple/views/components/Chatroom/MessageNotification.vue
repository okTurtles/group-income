<template>
  <div class="c-message">
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  display: inline-block;
  margin: $gi-spacer auto 0;
  text-align: center;
  max-width: 20rem;
  background-color: $light;
  border-radius: $radius-large;
  padding: $gi-spacer-xs $gi-spacer-sm;
}
</style>
<script>
export default {
  name: 'MessageNotification',
  components: {},
  props: {},
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
