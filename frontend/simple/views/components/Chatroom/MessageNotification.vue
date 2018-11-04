<template>
  <div class="c-message" v-html="text" />
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-message {
  display: inline-block;
  margin: $gi-spacer $gi-spacer 0;
  padding: $gi-spacer-xs $gi-spacer-sm;
  text-align: center;
  max-width: 32rem;
  background-color: $light;
  border-radius: $radius-large;

  @include phablet {
    margin: $gi-spacer $gi-spacer 0;
  }
}
</style>
<script>
export default {
  name: 'MessageNotification',
  components: {},
  props: {
    text: String
  },
  data () {
    return {}
  },
  computed: {},
  methods: {}
}
</script>
