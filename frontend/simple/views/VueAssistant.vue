<template>
  <!--
  Usage: <vue-assistant :views="[Component1, Component2, ...]"></vue-assistant>
  -->
  <div class="assistant">
    <div class="tabs is-centered is-toggle is-small" v-show="showSteps">
      <ul>
        <!-- http://vuejs.org/guide/list.html -->
        <li v-for="step in views.length"
          class="foo is-unselectable"
          :class='{"is-active": step <= currentStep + 1}'
        >
        </li>
      </ul>
    </div>
    <!-- https://vuejs.org/v2/guide/components.html#keep-alive -->
    <keep-alive>
      <component
        :is="view"
        :transition="transition"
        @next="next">
      </component>
    </keep-alive>
    <div class="container">
      <slot name="back">
        <!-- default content goes here -->
        <a class="button" @click="prev" :disabled="!this.currentStep">Back</a>
      </slot>
      <slot name="next">
        <a class="button" @click="next">Next</a>
      </slot>
    </div>
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
  created () {
  },
  beforeMount () {
  },
  mounted () {
  },
  methods: {
    next () {
      if (this.currentStep + 1 === this.views.length) {
        this.$emit('done')
      } else {
        this.currentStep += 1
      }
    },
    prev () {
      if (this.currentStep > 0) {
        this.currentStep -= 1
      }
    }
  },
  computed: {
    view () {
      return this.views[this.currentStep]
    }
  },
  data () {
    return {
      currentStep: 0
    }
  }
}
</script>
