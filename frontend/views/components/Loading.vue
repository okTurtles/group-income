<template lang='pug'>
.c-loading.has-text-centered(
  :class='{ "c-fullView": theme === "fullView" }'
)
  h1.is-title-1 {{ title }}
  p {{ text }}
</template>

<script>
import { L } from '@common/common.js'
export default ({
  name: 'Loading',
  props: {
    title: {
      default: L('Hang in there'),
      type: String
    },
    text: {
      default: L('Magic is happening...'),
      type: [String, Number]
    },
    theme: {
      validator (value) {
        return ['fullView', ''].indexOf(value) !== -1
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-loading {
  opacity: 0;
  padding: 2rem 0;
  animation: showLoading 200ms 500ms forwards;

  &.c-fullView {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

@keyframes showLoading {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
