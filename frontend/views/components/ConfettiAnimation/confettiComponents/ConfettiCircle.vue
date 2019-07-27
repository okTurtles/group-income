<template lang="pug">
  g.confetti(
    :transform='`translate(${position.x},${position.y})`'
  )
    g.inner(
      :stroke='color'
      :fill='color'
      :transform='`translate(${transforms.translate},0) rotate(${transforms.rotate}) scale(1,${transforms.scale})`'
    )
      circle.circle(
        cx="0" cy="0" r="8"
        stroke-width="3"
        stroke-linejoin="round"
        stroke-linecap="round"
      )
</template>

<script>
export default {
  name: 'ConfettiCircle',
  props: {
    position: Object,
    transforms: Object,
    color: String
  }
}
</script>
