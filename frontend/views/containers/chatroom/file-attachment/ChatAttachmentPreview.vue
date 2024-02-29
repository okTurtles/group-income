<template lang='pug'>
.c-attachment-container(:class='{ "is-for-download": isForDownload }')
  template(v-if='isForDownload')
    .c-attachment-preview(
      v-for='entry in attachmentList'
      :key='entry.attachmentId'
      class='is-download-item'
    )
      .c-preview-non-image
        .c-non-image-icon
          i.icon-file

        .c-non-image-file-info
          .c-file-name.has-ellipsis {{ entry.name }}
          .c-file-ext {{ fileExt(entry) }}

  template(v-else)
    .c-attachment-preview(
      v-for='entry in attachmentList'
      :key='entry.attachmentId'
      :class='"is-" + entry.attachType'
    )
      img.c-preview-img(
        v-if='entry.attachType === "image" && entry.url'
        :src='entry.url'
        :alt='entry.name'
      )
      .c-preview-non-image(v-else)
        .c-non-image-icon
          i.icon-file

        .c-non-image-file-info
          .c-file-name.has-ellipsis {{ entry.name }}
          .c-file-ext {{ fileExt(entry) }}

      button.c-attachment-remove-btn(
        type='button'
        :aria-label='L("Remove attachment")'
        @click='$emit("remove", entry.url)'
      )
        i.icon-times

      .c-loader(v-if='!entry.downloadData')
</template>

<script>
export default {
  name: 'ChatAttachmentPreview',
  props: {
    attachmentList: {
      // [ { url: string, name: string, attachType: enum of ['image', 'non-image'] }, ... ]
      type: Array,
      required: true
    },
    isForDownload: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    fileExt ({ name }) {
      const lastDotIndex = name.lastIndexOf('.')
      const ext = lastDotIndex === -1 ? '' : name.substring(lastDotIndex + 1)
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  &.is-for-download {
    padding: 0;
  }
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

  &.is-non-image,
  &.is-download-item {
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
    z-index: 2;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 1rem;
    font-weight: 600;
    font-size: 0.75rem;
    background-color: $text_1;
    color: $general_1;
  }

  .c-loader {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 0.25rem;
    overflow: hidden;

    &::before {
      content: "";
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: $general_1;
      opacity: 0.65;
    }

    &::after {
      content: "";
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      width: 1rem;
      height: 1rem;
      border: 2px solid;
      border-top-color: transparent;
      border-radius: 50%;
      color: $primary_0;
      animation: loadSpin 1.75s infinite linear;
    }
  }

  &.is-download-item {
    cursor: pointer;

    &:hover,
    &:focus {
      .c-file-name {
        text-decoration: underline;
      }
    }
  }
}
</style>
