<template lang='pug'>
  .c-modal(
    data-test='modal'
    role='dialog'
    :aria-labelledby='$scopedSlots.title'
    aria-modal='true'
    tabindex='-1'
    v-focus=''
    @keyup.tab='testFocus'
  )
    transition(name='fade' appear)
      .c-modal-background(@click='close' v-if='isActive')

    transition(name='slide-left' appear @after-leave='unload')
      .c-modal-content(ref='card' v-if='isActive')
        header.c-modal-header(
          :class='{ "has-subtitle": $scopedSlots.subtitle }'
          v-if='$scopedSlots.title || $scopedSlots.subTitle'
        )
          modal-close(@close='close' :back-on-mobile='backOnMobile')
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
  min-height: 4.75rem;

  @include tablet {
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

.is-left-aligned {
  .c-modal-header {
    @include until($tablet) {
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
    }
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

.c-modal-close {
  background-color: #fff;
}

// Mofifiers
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

.has-background {
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
