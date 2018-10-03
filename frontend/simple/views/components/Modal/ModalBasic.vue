<template>
  <div class="modal is-active" data-test="modal" v-if="isActive">
    <div class="modal-background" @click="handleCloseClick"></div>
    <div class="modal-card" ref="card">
      <button class="delete" aria-label="close" @click="handleCloseClick"></button>
      <slot></slot>
    </div>
  </div>
</template>
<script>
export default {
  name: 'ModalBasic',
  props: {
    isActive: Boolean
  },
  mounted () {
    global.addEventListener('keyup', this.handleKeyUp)
  },
  methods: {
    handleCloseClick () {
      this.closeModal()
    },
    handleKeyUp (event) {
      if (this.isActive && event.keyCode === 27) { // esc key
        this.closeModal()
      }
    },
    closeModal () {
      this.$emit('close')
    }
  }
}
</script>
