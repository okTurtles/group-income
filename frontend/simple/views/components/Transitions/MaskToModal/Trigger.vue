<template>
  <transition appear @enter="triggerEnter" @after-enter="transitionAfterEnter" @leave="triggerLeave">
    <slot></slot>
  </transition>
</template>
<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Trigger',
  mixins: [ mixinTransitions ]
}
</script>
