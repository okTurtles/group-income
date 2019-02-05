<template>
  <div class="modal is-active" data-test="modal" v-if="isActive">
    <div class="modal-background" @click="closeModal"></div>
    <div class="modal-card" ref="card">
      <button class="delete" aria-label="close" @click="closeModal"></button>
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
    window.addEventListener('keyup', this.handleKeyUp)
  },
  beforeDestroy () {
    window.removeEventListener('keyup', this.handleKeyUp)
  },
  methods: {
    handleKeyUp (event) {
      if (event.key === 'Escape' && this.isActive) {
        this.closeModal()
      }
    },
    closeModal () {
      this.$emit('close')
    }
  }
}
</script>
