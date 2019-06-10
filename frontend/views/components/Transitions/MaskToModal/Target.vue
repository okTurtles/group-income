<template lang="pug">
transition(
  appear=''
  @enter='targetEnter'
  @after-enter='transitionAfterEnter'
  @leave='targetLeave'
  :css='false'
)
  slot
</template>

<script>
import mixinTransitions from './mixinTransitions.js'

export default {
  name: 'Target',
  mixins: [ mixinTransitions ],
  props: ['targetCard'] // vue ref to modal's card
}
</script>
