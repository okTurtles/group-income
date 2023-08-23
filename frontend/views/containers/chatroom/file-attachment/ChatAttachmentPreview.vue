<template lang='pug'>
.c-attachment-container
  .c-attachment-preview(
    :class='"is-" + attachType'
  )
    img.c-preview-img(
      v-if='attachType === "image"'
      :src='url'
      :alt='name'
    )
    .c-preview-non-image(v-else)
      .c-non-image-icon
        i.icon-file

      .c-non-image-file-info
        .c-file-name.has-ellipsis {{ name }}
        .c-file-ext {{ fileExt }}

    button.c-attachment-remove-btn(
      type='button'
      :aria-label='L("Remove attachment")'
      @click='$emit("remove")'
    )
      i.icon-times
</template>

<script>
export default {
  name: 'ChatAttachmentPreview',
  props: {
    url: String,
    name: String,
    attachType: {
      // enum of ['image', 'non-image']
      type: String,
      default: 'image'
    }
  },
  computed: {
    fileExt () {
      const splitted = this.name.split('.')
      const ext = splitted[splitted.length - 1] || ''
      return ext.toUpperCase()
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-attachment-container {
  position: relative;
  padding: 0 0.5rem;
  margin-top: 0.75rem;
  width: 100%;
}

.c-attachment-preview {
  position: relative;
  display: inline-block;
  border: 1px solid var(--general_0);
  border-radius: 0.25rem;

  &.is-image {
    width: 4.5rem;
    height: 4.5rem;
  }

  &.is-non-image {
    max-width: 17.25rem;
    min-width: 14rem;
    min-height: 3.5rem;
  }

  .c-preview-img,
  .c-preview-non-image {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background-color: $general_2;
  }

  .c-preview-img {
    display: inline-block;
    object-fit: cover;
  }

  .c-preview-non-image {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "preview-icon preview-info";
    align-items: center;
    padding: 0.5rem;
    gap: 0.5rem;

    .c-non-image-icon {
      grid-area: preview-icon;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1.25rem;
      color: $primary_0;
      background-color: $primary_2;
    }

    .c-non-image-file-info {
      grid-area: preview-info;
      position: relative;
      display: block;
      line-height: 1.2;
      width: 100%;

      .c-file-name {
        position: relative;
        font-weight: bold;
        max-width: 13.25rem;
      }
    }
  }

  button.c-attachment-remove-btn {
    @extend %reset-button;
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    top: 0;
    right: 0;
    transform: translate(50%, -50%);
    z-index: 1;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 1rem;
    font-weight: 600;
    font-size: 0.75rem;
    background-color: $text_1;
    color: $general_1;
  }
}
</style>
