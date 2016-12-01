<template>
  <!-- TODO: would it be better if we used <vue-router>?
           i.e. it might be better to just append a thing
           to the URL, like /signup?next=create-group -->
  <!-- An alternative:
    instead of creating a full-blown "vue-assistant"
    we can focus on squeezing the most out of vue-router by using
    its Transition hooks and beforeEach/afterEach thing. Then
    simply have a conditional "steps" nav view thing that's shown
    depending on whatever the currently shown component feels is
    approrpiate.
    See also `abstract` router mode:
    http://router.vuejs.org/en/options.html
    And nested routes:
    http://router.vuejs.org/en/nested.html
  -->
  <div>
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
    <component
      :is="view"
      :transition="transition"
      style="position: absolute; width: 100%"
    >
    </component>
  </div>
</template>
<style lang="sass" scoped>
@import "sass/utilities/variables"
// TODO: foo is a silly name, pick a better one
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
    if (!this.loggedIn)
      setTimeout(() => this.next(), 5000)
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
