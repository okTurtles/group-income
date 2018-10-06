<template>
  <transition appear @enter="targetEnter" @after-enter="targetAfterEnter" @leave="targetLeave">
    <slot></slot>
  </transition>
</template>
<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Target',
  mixins: [ mixinTransitions ],
  props: ['targetCard'] // vue ref to modal's card
}
</script>
