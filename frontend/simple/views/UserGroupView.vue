<template lang="ejs">
  <div class="user-group">
    <h1>{{ msg }}</h1>
    <div><%- include included %></div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      // note: changing this line won't causes changes
      // with hot-reload because the reloaded component
      // preserves its current state and we are modifying
      // its initial state.
      msg: 'User Group!'
    }
  }
}
</script>
