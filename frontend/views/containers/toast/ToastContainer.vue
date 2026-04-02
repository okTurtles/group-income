<template lang='pug'>
.toast-container.c-toast-container(:class='{ "is-global": isGlobalToast }')
  .toast-inner-pocket.is-bottom-right
    toast-card(
      v-for='item in ephemeral.items'
      :key='item.id'
      :data='item'
      @close='onToastCardClose'
    )
</template>

<script>
import sbp from '@sbp/sbp'
import { SHOW_TOAST } from '@utils/events'
import { MAX_TOAST_COUNT } from '@utils/constants'
import ToastCard from '@containers/toast/ToastCard.vue'
import { randomHexString } from 'turtledash'

export default {
  name: 'ToastContainer',
  components: {
    ToastCard
  },
  props: {
    containerId: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      ephemeral: {
        items: [
          {
            id: 'random-id-1',
            message: 'This is a test message',
            closeable: true
          }
        ]
      }
    }
  },
  computed: {
    isGlobalToast () {
      return this.containerId === 'app-global'
    }
  },
  methods: {
    onShowToast (targetContainerId = '', data = null) {
      if (targetContainerId !== this.containerId || !data) { return }

      const item = {
        id: randomHexString(10),
        createdTimestamp: Date.now(),
        ...data
      }
      this.ephemeral.items.push(item)

      while (this.ephemeral.items.length > MAX_TOAST_COUNT) {
        this.ephemeral.items.shift()
      }
    },
    onToastCardClose (cardId) {
      if (cardId) {
        this.ephemeral.items = this.ephemeral.items.filter(item => item.id !== cardId)
      }
    }
  },
  mounted () {
    sbp('okTurtles.events/on', SHOW_TOAST, this.onShowToast)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', SHOW_TOAST, this.onShowToast)
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-toast-container {
  display: block;
}
</style>
