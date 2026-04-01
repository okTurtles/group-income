<template lang='pug'>
.toast-container.c-toast-container(:class='{ "is-global": isGlobalToast }')
  .toast-inner-pocket.is-bottom-right
    toast-card(v-for='item in ephemeral.items' :key='item.id' :data='item')
</template>

<script>
import sbp from '@sbp/sbp'
import { SHOW_TOAST } from '@utils/events'
import ToastCard from '@containers/toast/ToastCard.vue'

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
            message: 'This is a test message'
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

      this.ephemeral.items.push(data)
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
