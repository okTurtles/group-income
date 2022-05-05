<template lang='pug'>
  .c-modal(
    data-test='modal'
    role='dialog'
    tabindex='-1'
    :aria-label='a11yTitle'
    v-focus=''
  )
    transition(name='fade' appear)
      .c-modal-background(@click='closeModal' v-if='modalIsActive')

    transition(name='slide-left' appear @after-leave='unload')
      .c-modal-content(ref='card' v-if='modalIsActive')
        header.c-modal-header(
          :class='{ "has-subtitle": $scopedSlots.subtitle }'
          v-if='$scopedSlots.title || $scopedSlots.subtitle'
        )
          modal-close(@close='close' :back-on-mobile='backOnMobile' v-if='!modalForceAction')
          h2.is-subtitle(v-if='$scopedSlots.subtitle')
            slot(name='subtitle')
          h1.is-title-1(v-if='$scopedSlots.title' data-test='modal-header-title')
            slot(name='title')

        section.c-modal-body
          slot

        footer.c-modal-footer(v-if='$scopedSlots.footer')
          slot(name='footer')
</template>

<script>
import modalMixins from './ModalMixins.js'
import trapFocus from '@utils/trapFocus.js'

export default ({
  name: 'ModalTemplate',
  mixins: [modalMixins, trapFocus],
  methods: {
    closeModal () {
      if (!this.modalForceAction) {
        this.close()
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-modal {
  display: flex;
  position: fixed;
  z-index: $zindex-modal;
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
  background: $background_0;

  @include desktop {
    position: relative;
    border-radius: 0.375rem;
    max-width: 40rem;
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
}

.c-modal-header,
.c-modal-body {
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
    max-width: 33.375rem;
  }
  @include desktop {
    max-width: 25rem;
  }
}

.c-modal-header {
  position: relative;
  padding: 0 1rem;
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

  @media screen and (max-height: 31rem) {
    min-height: 5.125rem;
  }
}

.is-left-aligned {
  .c-modal-header {
    @include touch {
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
    }
  }
}

.c-modal-body {
  margin: 1rem 1rem 2rem 1rem;

  &:last-child {
    padding-bottom: 2rem;
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

  @include touch {
    border-radius: 0.25rem;
  }

  @include desktop {
    padding-bottom: 4rem;
    max-width: 100%;
    align-self: normal;
  }

  @media screen and (max-height: 500px) {
    padding-bottom: 1rem;
  }

  .button {
    &:not(:last-child) {
      margin-right: 10px;
    }
  }
}

.c-modal-close {
  background-color: $background_0;
}

// Mofifiers
.has-background {
  .c-modal-close {
    background-color: $background_0;
  }

  .c-modal-header {
    background-color: $general_2;
  }

  .c-modal-body {
    margin-top: 2rem;
  }

  .c-modal-footer {
    background-color: $general_2;
    margin: 1rem;
    padding: 1rem;

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

      @include desktop {
        text-align: center;
      }
    }
  }
}
</style>
