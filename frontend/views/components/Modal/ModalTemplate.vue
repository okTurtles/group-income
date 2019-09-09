<template lang='pug'>
  .c-modal(data-test='modal' role='dialog')
    transition(name='fade' appear)
      .c-modal-background(@click='close' v-if='isActive')

    transition(name='slide-left' appear)
      .c-modal-content(ref='card' v-if='isActive')
        header.c-modal-header(
          :class='{ "has-subtitle": $scopedSlots.subtitle }'
          v-if='$scopedSlots.title || $scopedSlots.subTitle'
        )
          modal-close(@close='close')
          h2.subtitle(v-if='$scopedSlots.subtitle')
            slot(name='subtitle')
          h1.title(v-if='$scopedSlots.title')
            slot(name='title')

        section.c-modal-body
          slot

        footer.c-modal-footer(v-if='$scopedSlots.footer')
          slot(name='footer')
</template>

<script>
import modalMixins from './ModalMixins.js'

export default {
  name: 'ModalTemplate',
  mixins: [modalMixins]
}
</script>

<style lang="scss" scoped>
@import "../../../assets/style/_variables.scss";

.c-modal {
  display: flex;
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  justify-content: center;
  align-items: center;
  max-width: 100vw;
  overflow: auto;
}

@include desktop {
  .c-modal-background {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: 0;
    background-color: rgba(10, 10, 10, 0.86);
  }
}

.c-modal-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  background: #fff;

  @include desktop {
    position: relative;
    border-radius: 6px;
    max-width: 640px;
    height: auto;
    margin: auto;
    transition: none !important;
  }
}

.c-modal-header,
.c-modal-body,
.c-modal-footer {
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  display: flex;
  @include tablet {
    align-items: center;
  }
}

.c-modal-body,
.c-modal-footer {
  align-self: center;
  width: 100%;
  max-width: calc(100% - 2rem);

  @include tablet {
    max-width: 534px;
  }

  @include desktop {
    max-width: 400px;
  }
}

.c-modal-header {
  position: relative;
  padding: 0 $spacer;
  min-height: 4.75ren;

  @include tablet {
    align-items: center;
    min-height: 5.75rem;
    align-items: center;
  }

  @include desktop {
    min-height: 6.5rem;
  }

  &.has-subtitle {
    min-height: 5.625rem;
    @include tablet {
      min-height: 6.625rem;
    }
    @include desktop {
      min-height: 7.5rem;
    }
  }

  @media screen and (max-height: 500px) {
    min-height: 50px;
  }
}

.c-modal-body {
  margin: $spacer $spacer $spacer-lg $spacer;

  &:last-child {
    padding-bottom: $spacer-lg;
  }

  > * {
    align-self: stretch;
  }

  @media screen and (max-height: 500px) {
    justify-content: normal;
    overflow: auto;
  }
}

.c-modal-footer {
  min-height: 53px;

  @include desktop {
    padding-bottom: $spacer-xl;
    max-width: 100%;
    align-self: normal;
  }

  @media screen and (max-height: 500px) {
    padding-bottom: $spacer;
  }

  .button {
    &:not(:last-child) {
      margin-right: 10px;
    }
  }
}

// TODO: check if that's generic
.title {
  font-size: $size-3;

  @include tablet {
    font-size: $size-2;
  }

  @include desktop {
    font-size: $size-1;
  }
}

.subtitle,
.title {
  margin: 0;
}

// Mofifiers
.has-no-background {
  .modal-close {
    top: 24px;
    right: 16px;
    background-color: #f1f1f1;
    width: 40px;
    height: 40px;
  }

  .modal-card-body {
    padding-top: 1.1rem;
  }
}

.has-background {
  .c-modal-close {
    background-color: #fff;
  }

  .c-modal-header{
    background-color: #f5f5f5;
  }

  .c-modal-body {
    margin-top: $spacer-lg;
  }
}

.has-background,
.has-background-footer {
  .c-modal-footer {
    background-color: #f5f5f5;
    margin: $spacer;
    padding: 0 1rem;

    @include desktop {
      align-items: flex-start;
      margin: 0;
      padding: 0 1.5rem;
    }
  }
}

.has-submodal-background {
  @include touch {
    .c-modal-content {
      &-head {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        z-index: 3;
        background-color: $primary_0;
        min-height: 64px;
      }
    }

    .title {
      font-weight: bold;
      font-size: 0.875rem;
    }

    .c-modal-close {
      right: auto;
      left: $spacer;
      font-family: "Font Awesome 5 Free";
      font-weight: 900;
      height: $spacer-lg;
      width: $spacer-lg;
      color: #999;
      background: transparent;
      top: $spacer;

      &:hover {
        color: $text_0;
      }

      &::after {
        content: none;
      }

      &::before {
        content: "\f053";
        background-color: transparent;
        position: relative;
        left: 3px;
        top: 0;
        width: 12px;
        height: auto;
        font-size: 0.875rem;
        transform: none !important;
      }
    }
  }
}

.has-submodal-background {
  @include touch {
    .modal-card {
      &-head {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        z-index: 3;
        background-color: var(--primary_0);
        min-height: 64px;
      }
    }

    .title {
      font-weight: bold;
      font-size: 0.875rem;
    }

    .modal-close {
      right: auto;
      left: 1rem;
      font-family: "Font Awesome 5 Free";
      font-weight: 900;
      height: 2rem;
      width: 2rem;
      color: #999;
      background: transparent;
      top: 1rem;

      &:hover {
        color: $text_0;
      }

      &::after {
        content: none;
      }

      &::before {
        content: "\f053";
        background-color: transparent;
        position: relative;
        left: 3px;
        top: 0;
        width: 12px;
        height: auto;
        font-size: 0.875rem;
        transform: none !important;
      }
    }
  }
}

.is-centered {
  .modal-card {
    &-body {
      width: 100%;
      max-width: calc(400px + 2rem);
      align-self: center;

      @include tablet {
        text-align: center;
      }
    }
  }
}
</style>
