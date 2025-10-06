<template lang='pug'>
component.field(:is='mode === "manual" ? "label" : "div"')
  .label(v-if='label') {{ label }}

  .inputgroup.c-mode-auto(
    v-if='mode === "auto"'
    :class='{ "password-copied": ephemeral.showCopyFeedback }'
    v-error:[name]=''
  )
    input.input.with-single-addon.c-auto-password(
      :class='{ "blurred-text has-ellipsis": ephemeral.pwMode === "text" }'
      :type='ephemeral.pwMode'
      :data-test='name'
      :value='ephemeral.randomPassword'
      :disabled='true'
    )

    .addons
      button.is-success.c-copy-btn(
        type='button'
        data-test='copyPassword'
        @click.stop='copyPassword'
      )
        span.c-copied(v-if='ephemeral.showCopyFeedback')
          i.icon-check-circle
          i18n Copied
        i18n.c-copy(v-else) Copy

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
      pwCopyTimeoutId: null,
      ephemeral: {
        randomPassword: '',
        showCopyFeedback: false,
        pwMode: 'text'
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
      required: false,
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

      if (process.env.NODE_ENV !== 'production' && process.env.UNSAFE_HARDCODED_TEST_PASSWORD === 'true') {
        // We can optionally use a hardcoded test password for easier debugging/development
        // so there is no need to memorize random passwords generated for each new account.
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
        this.ephemeral.pwMode = 'password'
        this.$emit('password-copied')

        clearTimeout(this.pwCopyTimeoutId)
        this.pwCopyTimeoutId = setTimeout(() => {
          this.ephemeral.showCopyFeedback = false
        }, 2000)
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
  position: relative;

  .c-auto-password {
    display: block;
    line-height: 2.75rem;
    padding-right: 5rem;

    &.blurred-text {
      color: transparent;
      text-shadow: 0 0 4px rgba(54, 54, 54, 0.725);
    }
  }

  .addons {
    align-items: center;
    right: 0.5rem;
  }
}

button.c-copy-btn {
  min-height: unset;
  height: 1.75rem;
  border-radius: 3px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  overflow: hidden;

  .c-copied {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.password-copied {
  .c-auto-password {
    padding-right: 7rem;
  }

  button.c-copy-btn {
    padding-left: 0.75rem;
  }
}

.is-dark-theme .c-auto-password.blurred-text {
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.685);
}
</style>
