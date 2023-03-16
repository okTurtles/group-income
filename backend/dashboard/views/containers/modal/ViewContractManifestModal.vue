<template lang="pug">
modal-template(:title='L("Contract manifest")' icon='suitcase')
  .c-contract-id-container
    span.c-id-label.has-family-poppins contractID :
    i.c-id-value {{ contract.contractId }}

  .c-code-demo-container
    .c-code-demo-block
      .c-code-demo-label head
      pre.custom-pre {{ content.head }}

    .c-code-demo-block
      .c-code-demo-label body
      pre.custom-pre {{ content.body }}}

    .c-code-demo-block
      .c-code-demo-label signature
      pre.custom-pre {{ content.signature }}
</template>

<script>
import ModalTemplate from './ModalTemplate.vue'

export default {
  name: 'ViewContractManifestModal',
  components: {
    ModalTemplate
  },
  props: {
    contract: Object
  },
  computed: {
    content () {
      const manifest = this.contract.manifestJSON
      const stringify = content => JSON.stringify(content).replace(/\\/g, '')

      return {
        head: stringify(manifest.head),
        body: stringify(manifest.body),
        signature: stringify(manifest.signature)
      }
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-contract-id-container {
  position: relative;
  padding-left: 0.8rem;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 0.4rem;
    background-color: $text_1;
  }

  .c-id-label {
    display: inline-block;
    margin-right: 0.4rem;
    font-weight: 600;
    font-size: $size_5;
  }

  .c-id-value {
    display: inline-block;
    max-width: 10rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    direction: rtl;
    padding-right: 1rem;

    @include phone_narrow {
      max-width: 7.5rem;
    }
  }
}

.c-code-demo-block {
  position: relative;
  margin-bottom: 1.2rem;
}

.c-code-demo-label {
  display: block;
  font-weight: 600;
  font-size: $size_5;
  font-family: "Poppins";
  margin-bottom: 0.4rem;
  margin-left: 0.2rem;
}
</style>
