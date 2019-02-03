<template>
  <div class="has-text-centered">
    <p class="c-description">
      <strong class="is-size-5 is-block c-nowrap">{{currency}} {{mincome}}</strong>
      <i18n>min income</i18n>
    </p>
    <div v-if="history.length">
      <div class="c-graph is-flex">
        <span v-for="(percentage, index) in history"
          class="c-graph-item"
          :style="{
            transform: `scaleY(${getHeight(percentage)})`,
            opacity: getOpacity(percentage)
          }">
        </span>
      </div>
      <p class="c-description">
        <strong class="is-block c-nowrap">+ {{getTotal()}} <i18n>distributed</i18n></strong>
        <i18n>on the last</i18n> {{history.length}} <i18n>months</i18n>
      </p>
    </div>
    <p v-else>We are on the first month.</p>
  </div>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

$barHeight: $gi-spacer*2.5;
$barMarginBottom: $gi-spacer-sm;

.c-description {
  line-height: 1.2;
  margin-bottom: $gi-spacer;
}

// REVIEW - make this a gi- class?
.c-nowrap {
  white-space: nowrap;
}

.c-graph {
  position: relative;
  margin: $gi-spacer 0 $barMarginBottom;

  &::after {
    content: "";
    position: absolute;
    bottom: $barHeight;
    left: 0;
    width: 100%;
    border-top: 1px dashed $body-background-color;
  }

  &-item {
    width: $gi-spacer;
    margin: 0 $gi-spacer-xs;
    height: $barHeight;
    background: $primary;
    display: block;
    transform: scaleY(0);
    transform-origin: 0 100%;
    animation: scaleUp 750ms forwards;
  }
}

@keyframes scaleUp {
  from { transform: scaleY(0); }
}

</style>
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
