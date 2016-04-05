<template>
  <div class="user-group">
    <h1>{{ msg }}</h1>
    <!--
      this was as hack I tried to get around `lang` not working [1]
      but it doesn't work either, probably because we're using
      browserify instead of webpack. [2]
      <require file="included.ejs"></require>
      [1] https://github.com/okTurtles/group-income-simple/issues/46
      [2] https://github.com/okTurtles/group-income-simple/issues/44
      this doesn't work either:
      <div>{{ 'included.ejs' | include }}</div>
    -->
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
