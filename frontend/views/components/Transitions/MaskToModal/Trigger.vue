<template lang="pug">
transition(
  appear=''
  @enter='triggerEnter'
  @after-enter='transitionAfterEnter'
  @leave='triggerLeave'
  :css='false'
)
  slot
</template>

<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Trigger',
  mixins: [mixinTransitions]
}
</script>
