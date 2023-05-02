<template lang='pug'>
.c-payment-methods-container
  .c-entry(
    v-for='item in ephemeral.paymentMethods'
    :key='item.id'
  )
    .inputgroup.c-method-group
      Dropdown.c-method-dropdown(
        :defaultText='L("Choose...")'
        :options='config.methodOptions'
        :isOverlayStyle='true'
        @select='$event => onDropdownSelect(item.id, $event)'
      )
      input.input.no-label.c-method-input(type='text' v-model='item.detail')

    button.is-icon.c-delete-entry-btn(
      v-if='ephemeral.paymentMethods.length > 1'
      @click='deleteEntry(item.id)'
    )
      i.icon-minus-circle

  .c-add-more
    button.is-unstyled.c-add-more-btn(v-if='showAddMore' type='button' @click='addEntry')
      i.icon-plus-circle
      i18n.is-inline-block Add more
</template>

<script>
import { cloneDeep } from '@common/cdLodash.js'
import Dropdown from '@forms/Dropdown.vue'

const genRandomId = () => Math.random().toString(20).slice(2)

export default {
  name: 'PaymentMethods',
  props: {
    methods: {
      type: Array,
      required: true
    }
  },
  components: {
    Dropdown
  },
  computed: {
    showAddMore () {
      return this.ephemeral.paymentMethods.length < this.config.methodOptions.length
    }
  },
  data () {
    return {
      config: {
        methodOptions: [
          { id: 'paypal', name: 'Paypal' },
          { id: 'bitcoin', name: 'Bitcoin' },
          { id: 'venmo', name: 'Venmo' }
        ]
      },
      ephemeral: {
        paymentMethods: [
          { id: genRandomId(), method: null, detail: '' }
        ]
      },
      syncDebounceId: null
    }
  },
  methods: {
    onDropdownSelect (targetId, selectedItem) {
      const found = this.ephemeral.paymentMethods.find(x => x.id === targetId)
      found.method = selectedItem

      this.$emit('update:methods', cloneDeep(this.ephemeral.paymentMethods))
    },
    addEntry () {
      this.ephemeral.paymentMethods.push({ id: genRandomId(), method: null, detail: '' })
    },
    deleteEntry (targetId) {
      const index = this.ephemeral.paymentMethods.findIndex(x => x.id === targetId)
      this.ephemeral.paymentMethods.splice(index, 1)
    },
    debouncedMethodsSync () {
      if (this.syncDebounceId) {
        clearTimeout(this.syncDebounceId)
      }

      this.syncDebounceId = setTimeout(() => {
        this.$emit('update:methods', cloneDeep(this.ephemeral.paymentMethods))
      }, 800)
    }
  },
  updated () {
    this.debouncedMethodsSync()
  }
}
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

@mixin button-common {
  border: 1px solid rgba(0, 0, 0, 0);
  background-color: $background_active;
  transition:
    box-shadow 200ms,
    border-color 120ms;

  &:hover,
  &:focus {
    border-color: $border;
    box-shadow: 0 0 4px $background_active;
  }

  &:active {
    border-color: $text_1;
  }
}

.c-payment-methods-container {
  position: relative;
}

.c-entry {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.inputgroup .c-method-input {
  height: 2.5rem;
  border-radius: 0 0.5rem 0.5rem 0;
  border: 1px solid $text_1;
}

.c-method-dropdown {
  ::v-deep .c-dropdown-trigger {
    border-radius: 0.5rem 0 0 0.5rem;

    &:hover {
      box-shadow: none;
    }
  }
}

.c-delete-entry-btn {
  flex-shrink: 0;
  border-radius: 50%;
  width: 2.25rem;
  height: 2.25rem;
  margin-left: 0.5rem;
  @include button-common;
}

.c-add-more {
  display: flex;
  justify-content: flex-end;
}

button.c-add-more-btn {
  display: inline-flex;
  align-items: center;
  font-size: $size_6;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  @include button-common;

  > i {
    position: relative;
    display: inline-block;
    font-size: 1.25em;
    margin-right: 0.15rem;
    transform: translateY(2px);
  }
}
</style>
