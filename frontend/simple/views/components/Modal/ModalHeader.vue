<template>
  <header class="modal-card-head has-text-centered">
    <h1 class="modal-card-title title is-size-5 is-marginless has-text-text-light" v-if="$slots.subTitle">
      <slot></slot>
    </h1>
    <h2 class="title is-size-3">
      <slot name="subTitle" v-if="$slots.subTitle"></slot>
      <slot v-else></slot>
    </h2>
  </header>
</template>
<script>
export default {
  name: 'ModalHeader'
}
</script>
