<template>
  <transition @enter="triggerEnter" @leave="triggerLeave">
    <slot></slot>
  </transition>
</template>
<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Trigger',
  mixins: [ mixinTransitions ],
  props: {}
}
</script>
