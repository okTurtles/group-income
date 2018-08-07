<template>
    <span><slot></slot></span>
</template>
<script>
export default{
  props: {args: [Object, Array]},
  beforeMount: function () {
    this.$slots.default[0].text = this.L(`${this.$slots.default[0].text}.text`, this.args || [], {defaultValue: this.$slots.default[0].text})
  }
}
</script>
