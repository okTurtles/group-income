<template lang='pug'>
.c-modal(
  role='dialog'
  tabindex='-1'
  v-focus=''
)
  transition(name='fade' appear)
    .c-modal-background(v-if='isActive' @click='close')

  transition(name='zoom' appear)
    .c-modal-content(v-if='isActive')
      header.c-modal-header
        template(v-if='title')
          i(:class='`icon-${icon} c-icon`')
          h1.is-title-2.c-title {{ title }}

        button.is-icon.c-close-btn(@click='close')
          i.icon-close

      section.c-modal-body
        slot

      slot(name='footer')
        footer.c-modal-footer
          i18n.has-blue-background.c-dismiss-btn(tag='button' @click='close') Close
</template>

<script>
import sbp from '@sbp/sbp'
import { CLOSE_MODAL } from '@view-utils/events.js'

export default {
  name: 'ModalTemplate',
  props: {
    title: String,
    icon: {
      type: String,
      required: false,
      default: 'info'
    }
  },
  data () {
    return {
      isActive: true
    }
  },
  methods: {
    close () {
      if (!this.isActive) { return }

      this.isActive = false
      setTimeout(() => sbp('okTurtles.events/emit', CLOSE_MODAL), 300)
    }
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-modal {
  display: flex;
  position: fixed;
  z-index: $zindex-modal;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  justify-content: center;
  align-items: center;
  max-width: 100vw;
  overflow: auto;

  &-background {
    display: none;

    @include tablet {
      position: fixed;
      display: block;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: rgba(10, 10, 10, 0.86);
    }
  }

  &-content {
    position: absolute;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
    height: 100%;
    margin: 0 auto;
    background: var(--modal-bg-color);

    @include tablet {
      position: relative;
      border-radius: 0.375rem;
      width: 46rem;
      max-width: calc(100vw - 4rem);
      height: auto;
      margin: auto;
    }
  }

  &-header {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 1.25rem;
    padding-right: 3.75rem;
    height: 4.25rem;
    flex-shrink: 0;
    border-bottom: 1px solid $border;
  }

  &-body {
    padding: 1.25rem;
    overflow-y: auto;
    overflow-x: hidden;
    word-break: break-word;
    min-height: 10.25rem;
    flex-grow: 1;

    @include desktop {
      max-height: 26.75rem;
    }
  }

  &-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 4.25rem;
    flex-shrink: 0;
    padding: 0 1.25rem;
    border-top: 1px solid $border;
  }
}

.c-title {
  line-height: 1.1;

  @include phone_narrow {
    font-size: $size_3;
  }
}

.c-icon {
  display: inline-block;
  margin-top: 2px;
  margin-right: 0.5rem;
  font: {
    size: 1.75rem;
    weight: 600;
  }

  @include phone_narrow {
    font-size: 1.5rem;
    margin-right: 0.25rem;
  }
}

.c-close-btn {
  position: absolute;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 50%;
  width: 2.25rem;
  height: 2.25rem;

  i {
    display: inline-block;
    line-height: 1;
    transform: translate(1px, 1px);
  }
}
</style>
