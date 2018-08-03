<template>
  <footer class="modal-card-foot">
    <div class="buttons">
      <slot></slot>
    </div>
    <p v-if="submitError" class="has-text-danger" data-test="submitError">{{ submitError }}</p>
  </footer>
</template>
<script>
export default {
  name: 'ModalHeader',
  props: {
    submitError: String
  }
}
</script>
