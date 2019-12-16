<script>
// From https://markus.oberlehner.net/blog/transition-to-height-auto-with-vue/
export default {
  name: 'TransitionExpand',
  functional: true,
  render (createElement, context) {
    const data = {
      props: {
        name: 'expand'
      },
      on: {
        afterEnter (element) {
          element.style.height = 'auto'
        },
        enter (element) {
          const { width } = getComputedStyle(element)
          element.style.width = width
          element.style.position = 'absolute'
          element.style.visibility = 'hidden'
          element.style.height = 'auto'

          const { height } = getComputedStyle(element)
          element.style.width = null
          element.style.position = null
          element.style.visibility = null
          element.style.height = 0

          // Force repaint to make sure the
          // animation is triggered correctly.
          // eslint-disable-next-line no-unused-expressions
          getComputedStyle(element).height
          setTimeout(() => {
            element.style.height = height
          })
        },
        leave (element) {
          const { height } = getComputedStyle(element)
          element.style.height = height

          // Force repaint to make sure the
          // animation is triggered correctly.
          // eslint-disable-next-line no-unused-expressions
          getComputedStyle(element).height

          setTimeout(() => {
            element.style.height = 0
          })
        }
      }
    }
    return createElement('transition', data, context.children)
  }
}
</script>

<style scoped>
  * {
    will-change: height;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
    overflow: hidden;
  }
</style>

<style>
.expand-enter-active,
.expand-leave-active {
  opacity: 1;
  transition:
    height 200ms cubic-bezier(0.82, 0.09, 0.4, 0.92),
    opacity 200ms cubic-bezier(0.82, 0.09, 0.4, 0.92);
  overflow: hidden;
}

.expand-enter,
.expand-leave-to {
  opacity: 0;
  height: 0;
}
</style>
