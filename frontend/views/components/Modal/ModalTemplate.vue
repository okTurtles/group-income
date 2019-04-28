<template lang='pug'>
  .modal(data-test='modal' role='dialog')
    transition(name='fade' appear)
      .modal-background(@click='close'  v-if='isActive')

    transition(name='slide-left' appear)
      .modal-card(ref='card' v-if='isActive')
        header.modal-card-head.has-text-centered(
          :class='{ "has-subtitle": $scopedSlots.subTitle }'
          v-if='$scopedSlots.title || $scopedSlots.subTitle'
        )
          modal-close(@close='close')
          h2.modal-card-title.subtitle.is-marginless.has-text-text-light(v-if='$scopedSlots.subTitle')
            slot(name='subTitle')
          h1.title(v-if='$scopedSlots.title')
            slot(name='title')

        section.modal-card-body
          slot
          .buttons(v-if='$scopedSlots.buttons')
            slot(name='buttons')

          p.has-text-danger(data-test='submitError' v-if='$scopedSlots.errors')
            slot(name='errors')

        footer.modal-card-foot(v-if='$scopedSlots.footer')
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
@import "../../../assets/sass/theme/index";

.modal {
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
  .modal-background {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: 0;
    background-color: rgba(10, 10, 10, 0.86);
  }
}

.modal-card {
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
    max-height: calc(100% - 20px);
    transition: none !important;
  }

  &-head,
  &-body,
  &-foot {
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    display: flex;
    @include tablet {
      align-items: center;
    }
  }

  &-head {
    position: relative;
    align-items: flex-start;
    padding: 0 $gi-spacer;
    min-height: 88px;

    @include tablet {
      min-height: 95px;
      align-items: center;
    }

    @include tablet {
      min-height: 105px;
    }

    &.has-subtitle {
      @include tablet {
        min-height: 114px;
      }
      @include tablet {
        min-height: 124px;
      }
    }

    @media screen and (max-height: 500px) {
      min-height: 50px;
    }
  }

  &-body {
    width: 100%;
    padding: $gi-spacer-lg $gi-spacer;
    overflow: scroll;

    > * {
      align-self: stretch;
    }

    @include tablet {
      max-width: calc(400px + 2rem);
      align-self: center;
    }

    @media screen and (max-height: 500px) {
      overflow: scroll;
    }
  }

  &-foot {
    min-height: 53px;
    padding: $gi-spacer;

    @include desktop {
      padding-bottom: $gi-spacer-xl;
    }

    @media screen and (max-height: 500px) {
      padding-bottom: $gi-spacer;
    }

    .button {
      &:not(:last-child) {
        margin-right: 10px;
      }
    }
  }
}

.subtitle {
  color: #7a7a7a;
}

.title {
  font-size: 1.125rem;

  @include tablet {
    font-size: 1.5rem;
  }

  @include desktop {
    font-size: 2rem;
  }
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
  .modal-close {
    background-color: #fff;
  }

  .modal-card {
    &-head,
    &-foot {
      background-color: #f5f5f5;
    }

    &-foot {
      margin: $gi-spacer;

      @include desktop {
        align-items: flex-start;
        margin: 0;
        padding-bottom: $gi-spacer;
      }
    }
  }
}
</style>
