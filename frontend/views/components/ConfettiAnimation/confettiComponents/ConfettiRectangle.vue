<template lang="pug">
  g.confetti(
    :transform='`translate(${position.x},${position.y})`'
  )
    g.inner(
      :stroke='color'
      :fill='color'
      :transform='`translate(${transforms.translate},0) rotate(${transforms.rotate}) scale(1,${transforms.scale})`'
    )
      rect.rect(
        x="-6" y="-6" width="12" height="12"
        stroke-width="3"
        stroke-linejoin="round"
        stroke-linecap="round"
      )
</template>

<script>
export default {
  name: 'ConfettiRectangle',
  props: {
    position: Object,
    transforms: Object,
    color: String
  }
}
</script>
