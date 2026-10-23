<template lang='pug'>
  g.confetti(
    :transform='`translate(${position.x},${position.y})`'
    :opacity='opacity'
  )
    g.inner(
      :stroke='color'
      :fill='color'
      :transform='`translate(0,${innerGroupY})`'
    )
      g.object(
        :transform='`translate(${transforms.translate},0) rotate(${transforms.rotate}) scale(1,${transforms.scale})`'
      )
        circle.circle(
          cx='0' cy='0' r='8'
          stroke-width='3'
          stroke-linejoin='round'
          stroke-linecap='round'
        )
</template>

<script>
export default {
  name: 'ConfettiCircle',
  inheritAttrs: false,
  props: {
    position: Object,
    innerGroupY: [Number, String],
    opacity: [Number, String],
    transforms: Object,
    color: String
  }
}
</script>
