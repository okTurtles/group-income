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
        polygon.triangle(
          points='0 -12, 8 6, -8 6'
          stroke-width='3'
          stroke-linejoin='round'
          stroke-linecap='round'
        )
</template>

<script>
export default ({
  name: 'ConfettiTriangle',
  inheritAttrs: false,
  props: {
    position: Object,
    innerGroupY: [Number, String],
    opacity: [Number, String],
    transforms: Object,
    color: String
  }
}: Object)
</script>
