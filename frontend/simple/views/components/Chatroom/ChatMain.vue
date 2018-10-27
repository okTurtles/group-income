<template>
  <div class="c-chatmain">
    <p>ChatMain on the way</p>
    <hr>
    <p><b>{{ $route.params.username }}</b> private chat on the way</p>
    <slot></slot>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-chatmain {
  flex-grow: 1;
}
</style>
<script>
export default {
  name: 'ChatMain',
  components: {},
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
