<template>
  <transition @enter="transTargetEnter" @after-enter="transTargetAfterEnter" @leave="transTargetLeave">
    <slot></slot>
  </transition>
</template>
<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Target',
  mixins: [ mixinTransitions ],
  props: ['targetCard']
}
</script>
