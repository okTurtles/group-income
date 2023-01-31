<template lang='pug'>
.bar-graph-container(:class='{"c-getting-ready": !isReady}')
  single-bar(
    v-for='(bar, index) in bars'
    :key='`percentage-${index}`'
    :data='bar'
  )
</template>

<script>
import SingleBar from './SingleBar.vue'

export default ({
  name: 'BarGraph',
  components: {
    SingleBar
  },
  props: {
    bars: {
      type: Array, // [{ total, value }]
      default () { return [] }
    }
  },
  data () {
    return {
      isReady: false
    }
  },
  mounted () {
    setTimeout(() => { this.isReady = true }, 0)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.bar-graph-container {
  display: flex;
  margin: 1.5rem 0 1rem 0;
  gap: 1rem;

  @include phone {
    flex-direction: column-reverse;
    overflow: hidden;
  }
}

.c-getting-ready ::v-deep .bar-graph {
  &-progress {
    height: 0% !important;

    @include phone {
      width: 0% !important;
      height: 100% !important;
    }
  }

  &-title,
  &-txt {
    opacity: 0;
  }
}
</style>
