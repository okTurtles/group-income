<template>
  <!--
  Usage:

  <vue-assistant>
    <component-1></component-1>
    <component-2></component-2>
    <component-3></component-3>
    ... etc ...
  </vue-assistant>
  -->
  <div class="assistant">
    <div class="tabs is-centered is-toggle is-small" v-show="showSteps">
      <ul>
        <!-- http://vuejs.org/guide/list.html -->
        <li v-for="step in steps"
          class="foo is-unselectable"
          :class='{"is-active": step <= currentStep}'
        >
        </li>
      </ul>
    </div>
    <!-- TODO: wrap in: https://vuejs.org/v2/guide/components.html#keep-alive -->
    <component
      :is="view"
      :transition="transition"
      style="position: absolute; width: 100%"
    >
    </component>
    <slot name="back">
      <!-- default content goes here -->
    </slot>
    <slot name="next">
      <!-- default content goes here -->
    </slot>
  </div>
</template>
<style lang="sass" scoped>
@import "sass/utilities/variables"
// TODO: remove these styles or make them overridable. we should be styled by the parent component
.foo
  border-bottom: 3px solid $border
  width: 20px
  margin-right: 5px

.foo.is-active
  border-bottom-color: $primary
</style>
<script>
export default {
  name: 'VueAssistant',
  props: {
    views: {type: Array, required: true},
    transition: {type: String, default: 'fade'},
    showSteps: {type: Boolean, default: true}
  },
  mounted () {
    if (!this.loggedIn) {
      setTimeout(() => this.next(), 5000)
    }
  },
  methods: {
    next () {
      this.currentStep += 1
    }
  },
  computed: {
    steps () {
      return this.views.length
    },
    view () {
      console.log(this.$options.name, ' views!', this.views)
      console.log(this.$options.name, ' create-group:', this.$options.components['create-group'])
      return this.views[this.currentStep]
    }
  },
  data () {
    return {
      currentStep: 0
      // view: this.$options.views[0]
    }
  }
}
</script>
