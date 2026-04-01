<template lang='pug'>
.c-toast-container
  .c-toast-inner-pocket.is-bottom-left
    toast-card(v-for='item in ephemeral.items["bottom-left"]' :key='item.id' :data='item')
  .c-toast-inner-pocket.is-bottom-center
    toast-card(v-for='item in ephemeral.items["bottom-center"]' :key='item.id' :data='item')
  .c-toast-inner-pocket.is-bottom-right
    toast-card(v-for='item in ephemeral.items["bottom-right"]' :key='item.id' :data='item')
  .c-toast-inner-pocket.is-top-left
    toast-card(v-for='item in ephemeral.items["top-left"]' :key='item.id' :data='item')
  .c-toast-inner-pocket.is-top-center
    toast-card(v-for='item in ephemeral.items["top-center"]' :key='item.id' :data='item')
  .c-toast-inner-pocket.is-top-right
    toast-card(v-for='item in ephemeral.items["top-right"]' :key='item.id' :data='item')
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
      default: 'app-global'
    }
  },
  data () {
    return {
      ephemeral: {
        items: {
          'bottom-left': [],
          'bottom-center': [],
          'bottom-right': [],
          'top-left': [],
          'top-center': [],
          'top-right': []
        }
      }
    }
  },
  methods: {
    onShowToast (targetContainerId = '', data = null) {
      if (targetContainerId !== this.containerId || !data) { return }

      const toastPosition = data.position || 'bottom-right'
      this.ephemeral.items[toastPosition].push(data)
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
  position: absolute;
  display: block;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background-color: $success_0_1;
  opacity: 0.5;
}

.c-toast-inner-pocket {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 0.5rem;
}
</style>
