<template>
  <div class="modal is-active" data-test="modal" v-if="isActive">
    <div class="modal-background" @click="closeModal"></div>

    <div class="modal-card" ref="card">
      <button class="delete" aria-label="close" @click="closeModal"></button>

      <header class="modal-card-head has-text-centered" v-if="$slots.title || $slots.subTitle">
        <h1 class="modal-card-title title is-size-5 is-marginless has-text-text-light"  v-if="$slots.title">
          <slot name="title"></slot>
        </h1>

        <h2 class="title is-size-3" v-if="$slots.subTitle">
          <slot name="subTitle" ></slot>
        </h2>
      </header>

      <section class="modal-card-body">
        <slot></slot>
      </section>

      <footer class="modal-card-foot" v-if="$slots.buttons || $slots.footer || submitError">
        <div class="buttons" v-if="$slots.buttons">
          <slot name="buttons"></slot>
        </div>

        <p v-if="submitError" class="has-text-danger" data-test="submitError">{{ submitError }}</p>

        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Modal',
  props: {
    submitError: String,
    isActive: Boolean
  }
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