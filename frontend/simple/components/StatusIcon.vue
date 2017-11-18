<template>
  <span class="icon" :class="success ? 'has-text-success' : 'has-text-warning'">
    <i class="fa" :class="success ? 'fa-check-square' : 'fa-warning'"></i>
  </span>
</template>
<script>
export default {
  name: 'StatusIcon',
  props: {
    success: {type: Boolean}
  }
}
</script>
