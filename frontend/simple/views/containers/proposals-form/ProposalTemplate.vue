<template>
  <div>
    <header class="modal-card-head has-text-centered">
      <h1 class="modal-card-title title is-size-5 is-marginless has-text-grey">
        <i18n>New Proposal</i18n>
      </h1>
      <h2 class="title is-size-3">
        {{ subTitle }}
      </h2>
    </header>

    <section class="modal-card-body">
      <slot></slot>
    </section>

    <footer class="modal-card-foot">
      <div class="buttons">
        <button class="button is-primary" @click="onSubmit">
          <i18n>Submit Proposal</i18n>
        </button>
      </div>
      <span v-if="submitError" class="has-text-danger">{{ submitError }}</span>
    </footer>
  </div>
</template>
<script>
export default {
  name: 'ModalForm',
  props: {
    subTitle: String,
    submitError: String,
    onSubmit: Function
  }
}
</script>
