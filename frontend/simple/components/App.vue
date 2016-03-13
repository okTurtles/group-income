<template>
  <div>
    <app-header></app-header>
    <router-view></router-view>
  </div>
</template>

<script>
import Header from './Header.vue'

export default {
  components: {
    'app-header': Header
  }
}
</script>

<style>
body {
  font-family: Helvetica, sans-serif;
}
</style>
