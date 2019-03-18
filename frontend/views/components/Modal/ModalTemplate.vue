<template lang='pug'>
  .modal.is-active(data-test='modal' v-if='isActive' role='dialog')
    transition(name='fade' v-if='isActive' appear)
      .modal-background(@click='close')
    .modal-card(ref='card')
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

      footer.modal-card-foot(v-if='$scopedSlots.buttons || $scopedSlots.footer || $scopedSlots.errors')
        .buttons(v-if='$scopedSlots.buttons')
          slot(name='buttons')

        p.has-text-danger(data-test='submitError' v-if='$scopedSlots.errors')
          slot(name='errors')

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
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: none;
  z-index: 40;
  max-width: 100vw;

  &.is-active {
    display: flex;
  }
}

.modal-background {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  background-color: rgba(10, 10, 10, 0.86);
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
  }

  &-body {
    width: 100%;
    padding: $gi-spacer-lg $gi-spacer;

    > * {
      align-self: stretch;
    }

    @include tablet {
      max-width: calc(400px + 2rem);
      align-self: center;
    }
  }

  &-foot {
    min-height: 53px;
    padding: $gi-spacer;

    @include desktop {
      padding-bottom: $gi-spacer-xl;
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
.has-sticky-footer {
  .modal-card {
    @include desktop {
      min-height: 580px;
      padding-bottom: 53px;

      &-foot {
        min-height: 53px;
        position: absolute;
        bottom: 0;
        width: 100%;
        padding-bottom: $gi-spacer;
      }
    }
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
  }
}
</style>
