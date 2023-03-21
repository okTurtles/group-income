<template lang="pug">
.c-dropdown-wrapper(:class='{ "is-active": ephemeral.isActive }')
  button.is-outlined.c-dropdown-trigger(ref='button' @click='toggle')
    span.c-trigger-btn-text {{ buttonText }}
    i.icon-caret-down.c-trigger-btn-arrow

  ul.c-dropdown-options-list(v-if='options && ephemeral.isActive')
    li.c-dropdown-options-list-item(
      v-for='item in optionsToDisplay'
      :key='item.id'
      tabindex='0'
      @click='onItemSelect(item)'
    )
      span {{ item.name }}
</template>

<script>
import L from '@common/translations.js'

export default {
  name: 'Dropdown',
  props: {
    defaultText: {
      type: String,
      required: false,
      default: L('Select Item')
    },
    defaultItemId: { // 'id' of the option we want as a default
      type: String,
      required: false,
      default: ''
    },
    options: {
      // The format of the list must be { id: string, name: string, ... }
      type: Array,
      required: true
    }
  },
  data () {
    return {
      ephemeral: {
        selectedId: this.defaultItemId || '',
        isActive: false
      }
    }
  },
  computed: {
    buttonText () {
      return this.ephemeral.selectedId
        ? this.options.find(item => item.id === this.ephemeral.selectedId).name
        : this.defaultText
    },
    optionsToDisplay () {
      return this.ephemeral.selectedId ? this.options.filter(opt => opt.id !== this.ephemeral.selectedId) : this.options
    }
  },
  methods: {
    open () {
      this.ephemeral.isActive = true
    },
    close () {
      this.ephemeral.isActive = false
    },
    toggle () {
      if (this.ephemeral.isActive) this.close()
      else this.open()
    },
    onItemSelect (item) {
      this.ephemeral.selectedId = item.id
      this.$emit('select', item)
      this.close()

      this.$refs.button.focus()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-dropdown-wrapper {
  position: relative;
  min-width: 7.75rem;
  width: max-content;
  height: max-content;
}

.c-dropdown-trigger {
  position: relative;
  display: flex;
  justify-content: flex-start;
  min-width: inherit;
  border: 1px solid $text_1;
  min-height: 2.25rem;
  padding: 0.25rem 2.25rem 0.25rem 0.625rem;
  font-size: $size_5;
  line-height: 1;

  &:focus,
  .is-active & {
    background-color: var(--background_active);
    box-shadow: var(--button-box-shadow);
  }
}

.c-trigger-btn-arrow {
  display: inline-block;
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  font-size: 1.1em;
  font-weight: 600;
  margin-left: 1rem;
  transition: transform 300ms ease-out;
}

.c-dropdown-options-list {
  position: absolute;
  right: 0;
  top: 100%;
  min-width: 100%;
  border-radius: 0.5rem;
  border: 1px solid $border;
  overflow: hidden;
  height: auto;
  width: max-content;
  box-shadow: var(--button-box-shadow);
  z-index: 10;
  opacity: 0;
  transform: translateY(1.5rem);

  &-item {
    display: flex;
    align-items: center;
    text-align: right;
    width: 100%;
    min-height: 2.25rem;
    padding: 0.25rem 0.625rem;
    user-select: none;
    cursor: pointer;
    background-color: $background_0;

    &:hover,
    &:active {
      background-color: $background_active;
    }

    &:not(:last-child) {
      border-bottom: 1px solid $border;
    }

    span {
      display: inline-block;
    }
  }
}

.c-dropdown-wrapper.is-active {
  .c-trigger-btn-arrow {
    transform: translateY(-50%) rotate(180deg);
  }

  .c-dropdown-options-list {
    animation: dropdown-menu-reveal 300ms ease-out forwards;
  }
}

@keyframes dropdown-menu-reveal {
  0% {
    opacity: 0;
    transform: translateY(1.5rem);
  }

  100% {
    opacity: 1;
    transform: translateY(0.5rem);
  }
}
</style>
