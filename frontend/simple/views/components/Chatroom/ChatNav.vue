<template>
  <div class="c-chatnav">
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatnav {
  flex-basis: 13rem;
  border-right: 1px solid $grey-lighter;
}
</style>
<script>
export default {
  name: 'ChatNav',
  components: {},
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
