<template lang='pug'>
.toast-container.c-toast-container(
  :data-area='area'
)
  template(v-if='ephemeral.isLargeScreen')
    template(v-for='(items, position) in toastPockets.large')
      .toast-inner-pocket(
        v-if='items.length'
        :class='"is-" + position'
        :key='position'
      )
        toast-card(
          v-for='(item, index) in items'
          :key='item.id'
          :ref='"toast-card-" + item.id'
          :data='item'
          @close='onToastCardClose'
          @enter-animation-ended='onEnterAnimationEnded'
          @unpause-animation='onToastAnimationResume'
        )

  template(v-else)
    template(v-for='(items, position) in toastPockets.small')
      .toast-inner-pocket(
        v-if='items.length'
        :class='["for-small-screen", "is-" + position]'
        :key='position'
      )
        toast-card(
          v-for='item in items'
          :key='item.id'
          :ref='"toast-card-" + item.id'
          :data='item'
          @close='onToastCardClose'
          @enter-animation-ended='onEnterAnimationEnded'
          @unpause-animation='onToastAnimationResume'
        )
</template>

<script>
import sbp from '@sbp/sbp'
import { SHOW_TOAST } from '@utils/events'
import { MAX_TOAST_COUNT, TOAST_POSITIONS } from '@utils/constants'
import ToastCard from '@containers/toast/ToastCard.vue'
import { randomHexString } from 'turtledash'

export default {
  name: 'ToastContainer',
  components: {
    ToastCard
  },
  props: {
    area: {
      type: String,
      required: true
    },
    largeWidthThreshold: {
      type: Number,
      default: 769 // px
    }
  },
  data () {
    return {
      ephemeral: {
        matchMediaLarge: null,
        isLargeScreen: false,
        items: []
      }
    }
  },
  computed: {
    toastPockets () {
      const allPositions = Object.values(TOAST_POSITIONS)

      return {
        large: Object.fromEntries(
          allPositions.map(position => [position, this.ephemeral.items.filter(item => item.position === position)])
        ),
        small: {
          top: this.ephemeral.items.filter(
            item => [TOAST_POSITIONS.TOP_LEFT, TOAST_POSITIONS.TOP_CENTER, TOAST_POSITIONS.TOP_RIGHT].includes(item.position)
          ),
          bottom: this.ephemeral.items.filter(
            item => [TOAST_POSITIONS.BOTTOM_LEFT, TOAST_POSITIONS.BOTTOM_CENTER, TOAST_POSITIONS.BOTTOM_RIGHT].includes(item.position)
          )
        }
      }
    }
  },
  methods: {
    onShowToast (area = '', data = null) {
      if (area !== this.area || !data) { return }

      const item = {
        ...data,
        id: randomHexString(10),
        createdTimestamp: Date.now()
      }
      this.ephemeral.items.push(item)

      if (this.ephemeral.items.length > MAX_TOAST_COUNT) {
        const idxsToRemove = this.ephemeral.items.length - MAX_TOAST_COUNT
        for (let i = 0; i < idxsToRemove; i++) {
          const cardEl = this.$refs[`toast-card-${this.ephemeral.items[i].id}`]
          cardEl && cardEl[0]?.closeToast()
        }
      }
    },
    onToastCardClose (cardId) {
      if (cardId) {
        this.ephemeral.items = this.ephemeral.items.filter(item => item.id !== cardId)
      }
    },
    setupMatchMedia () {
      this.ephemeral.matchMediaLarge = window.matchMedia(`screen and (min-width: ${this.largeWidthThreshold}px)`)
      this.ephemeral.matchMediaLarge.onchange = (e) => {
        this.ephemeral.isLargeScreen = e.matches
      }
      this.ephemeral.isLargeScreen = this.ephemeral.matchMediaLarge.matches
    },
    onEnterAnimationEnded (cardId) {
      if (this.ephemeral.items.some(item => item.id === cardId)) {
        this.ephemeral.items = this.ephemeral.items.map(item => {
          if (item.id === cardId) {
            // 'entered' is a flag to track if the enter animation is done  so that it doesn't get triggered
            // repeatedly on re-rendering or layout changes (eg. toast container swtiches between large and small screen mode)
            return {
              ...item,
              entered: true
            }
          }
          return item
        })
      }
    },
    onToastAnimationResume (cardId, adjustedCreatedTimestamp) {
      if (cardId && adjustedCreatedTimestamp) {
        const found = this.ephemeral.items.find(item => item.id === cardId)
        if (found) {
          found.createdTimestamp = adjustedCreatedTimestamp
        }
      }
    }
  },
  created () {
    this.setupMatchMedia()
  },
  mounted () {
    sbp('okTurtles.events/on', SHOW_TOAST, this.onShowToast)
  },
  beforeDestroy () {
    // unregister event listeners to avoid memory leaks.
    sbp('okTurtles.events/off', SHOW_TOAST, this.onShowToast)
    this.ephemeral.matchMediaLarge.onchange = null
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-toast-container {
  display: block;
}
</style>
