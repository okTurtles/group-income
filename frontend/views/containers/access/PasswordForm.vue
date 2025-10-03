<template lang='pug'>
component.field(:is='mode === "manual" ? "label" : "div"')
  .label(v-if='label') {{ label }}

  .inputgroup.c-mode-auto(
    v-if='mode === "auto"'
    v-error:[name]=''
  )
    .input.width-with-single-addon.has-ellipsis.c-auto-password(
      :data-test='name'
    ) {{ ephemeral.randomPassword }}

    .addons
      button.is-success.c-copy-btn(
        type='button'
        @click.stop='copyPassword'
      )
        i18n Copy

    i18n.c-feedback(
      v-if='ephemeral.showCopyFeedback'
    ) Copied to clipboard!

  .inputgroup(
    v-else
    v-error:[name]=''
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
import { base58btc } from '@chelonia/multiformats/bases/base58'
import Tooltip from '@components/Tooltip.vue'
import validationsDebouncedMixins from '@view-utils/validationsDebouncedMixins.js'
import { L } from '@common/common.js'

function generateBase58Password (length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array((length)))
  const encoded = base58btc.baseEncode(bytes)

  // Truncate to desired length
  return encoded.slice(0, length)
}

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
    generateRandomPassword (pwLen = 32) {
      let genPassword = ''

      if (process.env.CI || (Math.random() > 1 && process.env.NODE_ENV !== 'production')) {
        // For easier debugging/development, use the common default password when running in non-production environments.
        // Comment out process.env.NODE_ENV !== 'production' though if you need to use/test the safe auto-generated password feature in local development.
        genPassword = '123456789'
      } else {
        genPassword = generateBase58Password(pwLen)
      }

      this.ephemeral.randomPassword = genPassword
      this.$v.form[this.name].$model = genPassword
    },
    copyPassword () {
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
