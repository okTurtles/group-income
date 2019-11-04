<template lang='pug'>
.has-text-centered
  p.c-description
    strong.is-size-5.is-block.c-nowrap {{currency}} {{mincome}}
    i18n min income

  div(v-if='history.length')
    .c-graph
      span.c-graph-item(
        v-for='(percentage, index) in history'
        :key='`percentage-${index}`'
        :style='{\
          transform: `scaleY(${getHeight(percentage)})`,\
          opacity: getOpacity(percentage)\
        }'
      )

    p.c-description
      strong.is-block.c-nowrap
        | + {{getTotal()}}
        i18n distributed
      i18n on the last
      |  {{history.length}}
      i18n months

  p(v-else='') We are on the first month.
</template>

<script>
export default {
  name: 'Bars',
  props: {
    history: Array,
    currency: String,
    mincome: Number
  },
  methods: {
    getOpacity (percentage) {
      return percentage > 1 ? '' : percentage
    },
    getHeight (percentage) {
      return percentage > 1.25 ? 1.25 : percentage
    },
    getTotal () {
      return '$4500'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

$barHeight: $spacer*2.5;
$barMarginBottom: $spacer-sm;

.c-description {
  line-height: 1.2;
  margin-bottom: $spacer;
}

.c-nowrap {
  white-space: nowrap;
}

.c-graph {
  display: flex;
  position: relative;
  margin: $spacer 0 $barMarginBottom;

  &::after {
    content: "";
    position: absolute;
    bottom: $barHeight;
    left: 0;
    width: 100%;
    border-top: 1px dashed $background;
  }
}

.c-graph-item {
  width: $spacer;
  margin: 0 $spacer-xs;
  height: $barHeight;
  background: $primary_0;
  display: block;
  transform: scaleY(0);
  transform-origin: 0 100%;
  animation: scaleUp 750ms forwards;
}

@keyframes scaleUp {
  from { transform: scaleY(0); }
}
</style>
