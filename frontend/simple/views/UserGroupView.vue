<template lang="ejs">
  <div class="content user-group">
    <h1 class="title">{{ msg }}</h1>
    <%- include included %>
  </div>
</template>

<script>
export default {
  name: 'UserGroupView',
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
