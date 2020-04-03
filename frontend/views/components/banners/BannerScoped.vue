<template lang='pug'>
  transition-expand
    .c-container(v-if='ephemeral.text')
      banner-simple(class='c-banner' :severity='ephemeral.severity')
        .c-inner
          .c-inner-text(:data-test='dataTest' role='alert' @click='handleMsgClick')
            | {{ ephemeral.text }}
            |
            span(v-if='ephemeral.error' v-html='linkToErrorReport')
          button.is-icon-small.c-button(
            type='button'
            :class='`is-${ephemeral.severity}`'
            :aria-label='L("Dismiss message")'
            @click='clean'
          )
            i.icon-times
</template>

<script>
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'
import L from '@view-utils/translations.js'
import BannerSimple from '@components/banners/BannerSimple.vue'
import TransitionExpand from '@components/TransitionExpand.vue'

export default {
  name: 'BannerScoped',
  components: {
    BannerSimple,
    TransitionExpand
  },
  props: {
    dataTest: {
      type: String,
      default: 'feedbackMsg'
    }
  },
  data: () => ({
    ephemeral: {
      text: null,
      severity: null,
      error: null
    }
  }),
  computed: {
    linkToErrorReport () {
      return L('Please check the {b1}error logs{b2} for more info.', {
        'b1': '<button class="link js-btnError">',
        'b2': '</button>'
      })
    }
  },
  methods: {
    handleMsgClick (e) {
      if (this.ephemeral.error && e.target.classList.contains('js-btnError')) {
        sbp('okTurtles.events/emit', OPEN_MODAL, 'UserSettingsModal',
          { // custom props
            tabProps: {
              'application-logs': {
                referalError: this.ephemeral.error
              }
            }
          },
          { // custom url query
            section: 'application-logs'
          }
        )
      }
    },
    // To be used by parent. Example:
    // this.$refs.BannerScoped.success(L('Changes saved!'))
    clean () {
      this.updateBanner('', '')
    },
    danger (text, opts) {
      this.updateBanner(text, 'danger')
      if (opts.error) { this.ephemeral.error = opts.error }
    },
    success (text) {
      this.updateBanner(text, 'success')
    },
    updateBanner (text, severity) {
      this.ephemeral.text = text
      this.ephemeral.severity = severity
      this.ephemeral.error = null
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-container {
  display: flex; /* so margins don't collapse and transition is smooth */
  align-items: flex-start;
  overflow: hidden;
}

.c-banner {
  width: 100%;
  margin-top: 1.5rem;
  overflow: hidden;
}

.c-inner {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  &-text {
    margin-top: 0.1875rem; // visually better centered aligned
    text-align: left; // force even when the parent has another alignment
    word-break: break-word; // handle long messages
    font-weight: 600;
  }
}

$severities:
  "success" $success_0 $success_1,
  "danger" $danger_0 $danger_1;

.c-button {
  transition: box-shadow 150ms ease-in;
  margin-left: 0.5rem;

  @each $class, $color, $hover in $severities {
    &.is-#{$class} {
      color: $color;

      &:hover,
      &:focus {
        background-color: $hover;
      }

      &:focus {
        box-shadow: 0 0 0 1px $color;
      }
    }
  }
}
</style>
