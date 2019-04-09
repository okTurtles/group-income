<template>
  <div class="modal is-active" data-test="modal" v-if="isActive" role='dialog'>
    <transition name="fade" v-if="isActive" appear>
      <div class="modal-background" @click="close"></div>
    </transition>
    <div class="modal-card" ref="card">

      <header class="modal-card-head has-text-centered"
              :class="{ 'has-subtitle': $scopedSlots.subTitle }"
              v-if="$scopedSlots.title || $scopedSlots.subTitle" >
        <button class="modal-close" @click.self="close"></button>
        <h2 class="modal-card-title subtitle is-marginless has-text-text-light"  v-if="$scopedSlots.subTitle">
          <slot name="subTitle" ></slot>
        </h2>
        <h1 class="title" v-if="$scopedSlots.title">
          <slot name="title"></slot>
        </h1>
      </header>

      <section class="modal-card-body">
        <slot></slot>
        <div class="buttons" v-if="$scopedSlots.buttons">
          <slot name="buttons"></slot>
        </div>

        <p class="has-text-danger" data-test="submitError" v-if="$scopedSlots.errors" >
          <slot name="errors"></slot>
        </p>
      </section>

      <footer class="modal-card-foot" v-if="$scopedSlots.buttons || $scopedSlots.footer || $scopedSlots.errors">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script>
import sbp from '../../../../shared/sbp.js'
import { OPEN_MODAL, CLOSE_MODAL } from '../../../utils/events.js'

export default {
  name: 'Modal',
  data () {
    return {
      isActive: false
    }
  },
  mounted () {
    this.isActive = true
    sbp('okTurtles.events/on', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/on', CLOSE_MODAL, this.closeModal)
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        this.close()
      }
    })
  },
  beforeDestroy () {
    window.removeEventListener('keyup', null)
    sbp('okTurtles.events/off', OPEN_MODAL, this.openModal)
    sbp('okTurtles.events/off', CLOSE_MODAL, this.closeModal)
  },
  methods: {
    close (e) {
      sbp('okTurtles.events/emit', CLOSE_MODAL)
    },
    openModal () {
      this.isActive = true
    },
    closeModal () {
      this.isActive = false
      this.$router.push({ query: { modal: undefined } })
    }
  }
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

.modal-close {
  position: absolute;
  z-index: 1;
  right: 1rem;
  height: 40px;
  width: 40px;
  border: none;
  border-radius: 50%;
  @extend %unselectable;
  -moz-appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-color: #f1f1f1;

  @include tablet {
    top: 24px;
    right: 24px;
  }

  @include desktop {
    top: 1rem;
    right: 1rem;
  }

  &::before,
  &::after {
    background-color: #363636;
    content: "";
    display: block;
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 2px;
    transition: transform 0.15s ease-in;
    transform: translateX(-50%) translateY(-50%) rotate(45deg);
    transform-origin: center center;
  }

  &::after {
    transform: translateX(-50%) translateY(-50%) rotate(-45deg);
  }

  &:hover {
    &::before {
      transform: translateX(-50%) translateY(-50%) rotate(0);
    }

    &::after {
      transform: translateX(-50%) translateY(-50%) rotate(0);
    }
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
  font-size: 0.75rem;
  text-transform: uppercase;
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
