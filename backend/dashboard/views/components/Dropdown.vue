<template lang="pug">
.c-dropdown-wrapper(:class='{ "is-active": ephemeral.isActive }')
  button.is-outlined.c-dropdown-trigger(@click='toggle')
    span.c-trigger-btn-text {{ buttonText }}
    i.icon-gear.c-trigger-arrow

  ul.c-dropdown-options-list(v-if='options && ephemeral.isActive')
    li.c-dropdown-options-list-item(
      v-for='item in optionsToDisplay'
      :key='item.id'
      tabindex='0'
      @click='onItemSelect'
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
        isActive: true
      }
    }
  },
  computed: {
    buttonText () {
      return this.defaultItemId
        ? this.options.find(item => item.id === this.defaultItemId).name
        : this.ephemeral.selectedItem
          ? this.ephemeral.selectedItem.name
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
  border: 2px dashed #000;
}

.c-dropdown-trigger {
  position: relative;
  display: flex;
  min-width: inherit;
  border: 1px solid $text_0;
  min-height: 2.25rem;
  padding: 0.25rem 0.625rem;
  font-size: $size_5;
  line-height: 1;

  > i {
    font-size: 1.1em;
    margin-left: 1rem;
  }
}

.c-dropdown-options-list {
  position: absolute;
  right: 0;
  top: 100%;
  transform: translateY(0.5rem);
  min-width: 100%;
  border-radius: 0.5rem;
  border: 1px solid $border;
  overflow: hidden;
  height: auto;
  width: max-content;

  &-item {
    display: flex;
    align-items: center;
    text-align: right;
    width: 100%;
    min-height: 2.25rem;
    padding: 0.25rem 0.625rem;

    &:not(:last-child) {
      border-bottom: 1px solid $border;
    }
  }
}
</style>
