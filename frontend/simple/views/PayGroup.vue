<template>
  <!-- main containers:
   .container  http://bulma.io/documentation/layout/container/
   .content    http://bulma.io/documentation/elements/content/
   .section    http://bulma.io/documentation/layout/section/
   .block      base/classes.sass (just adds 20px margin-bottom except for last)
   -->
  <section class="section">
    <h1>{{ msg }}</h1>
    <div class="box centered">
      <p class="control">
        {{ title }}
        <a class="button" @click="$emit('next')">Next</a>
      </p>
    </div>
  </section>
</template>

<script>
export default {
  name: 'PayGroup',
  props: {
    title: {type: String, default: 'A title'}
  },
  data () {
    return {
      // note: changing this line won't causes changes
      // with hot-reload because the reloaded component
      // preserves its current state and we are modifying
      // its initial state.
      msg: 'Pay Group!'
    }
  }
}
</script>
