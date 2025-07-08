<template lang='pug'>
label.field
  .label(v-if='label') {{ label }}

  .inputgroup.c-mode-auto(v-if='mode === "auto"')
    .input.width-with-single-addon.has-ellipsis.c-auto-password(
      :data-test='name'
    ) {{ ephemeral.randomPassword }}

    .addons
      button.is-success.c-copy-btn(
        type='button'
        @click.prevent.self='copyPassword'
      )
        i18n Copy

    i18n.c-feedback(
      v-if='ephemeral.showCopyFeedback'
    ) Copied to clipboard!

  .inputgroup(
    v-else
    v-error:[name]='{ attrs: { "data-test": "badPassword" }}'
  )
    input.input.with-single-addon(
      :type='isLock ? "password" : "text"'
      :class='[{error: $v.form[name].$error}, size]'
      :placeholder='showPlaceholder ? name : ""'
      :name='name'
      :data-test='name'
      v-model='$v.form[name].$model'
      @input='debounceField(name)'
      @blur='updateField(name)'
    )
    .addons
      button.is-icon(
        type='button'
        :aria-label='L("Toggle password visibility")'
        :aria-pressed='!isLock'
        @click.prevent='isLock = !isLock'
      )
        i(:class='isLock ? "icon-eye" : "icon-eye-slash"')
</template>

<script>
import Tooltip from '@components/Tooltip.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { L } from '@common/common.js'

export default ({
  name: 'PasswordForm',
  components: {
    Tooltip
  },
  data () {
    return {
      isLock: true,
      ephemeral: {
        randomPassword: '',
        showCopyFeedback: false
      }
    }
  },
  mixins: [validationsDebouncedMixins],
  props: {
    name: {
      type: String,
      required: false,
      default: 'password'
    },
    mode: {
      type: String,
      requried: false,
      default: 'manual' // 'manual' | 'auto'
    },
    label: {
      type: String,
      required: false
    },
    $v: {
      type: Object,
      required: true
    },
    showPlaceholder: {
      type: Boolean,
      default: false
    },
    showPassword: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      required: false
    }
  },
  methods: {
    generateRandomPassword (length = 32) {
      const bytes = new Uint8Array(Math.floor(length / 2))
      crypto.getRandomValues(bytes)

      this.ephemeral.randomPassword = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    },
    copyPassword () {
      console.log('!@# copy password!')
      const pw = this.ephemeral.randomPassword
      const copyToClipBoard = () => {
        navigator.clipboard.writeText(pw)
        this.ephemeral.showCopyFeedback = true

        setTimeout(() => {
          this.ephemeral.showCopyFeedback = false
        }, 1500)
      }

      if (navigator.share) {
        navigator.share({
          title: L('Your password'),
          text: pw
        }).catch((error) => {
          console.error('navigator.share failed with:', error)
          copyToClipBoard()
        })
      } else {
        copyToClipBoard()
      }
    }
  },
  created () {
    if (this.mode === 'auto') {
      this.generateRandomPassword()
    } else {
      this.isLock = !this.showPassword
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-mode-auto {
  .c-auto-password {
    display: block;
    line-height: 2.75rem;
    padding-right: 5.5rem;
  }

  .addons {
    align-items: center;
    right: 0.5rem;
  }
}

.icon {
  cursor: pointer;
  pointer-events: initial !important;
}

button.c-copy-btn {
  min-height: unset;
  height: 1.75rem;
  border-radius: 3px;
  padding-left: 1rem;
  padding-right: 1rem;
}

.c-feedback {
  @include tooltip-style-common;
  top: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
}
</style>
