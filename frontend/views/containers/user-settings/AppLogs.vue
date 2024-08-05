<template lang='pug'>
  .settings-container
    section.card
      .c-header
        p.c-instructions
          i18n(
            v-if='errorMsg'
            :args='{ a_: issuePageTag, _a: "</a>", errorMsg }'
          ) Recent error: "{errorMsg}". Please download the logs and {a_}send them to us{_a}, so we can help troubleshoot.
          i18n(
            v-else
            :args='{ a_: issuePageTag, _a: "</a>" }'
          ) If you encounter problems, please download the logs and {a_}send them to us{_a}.

        fieldset.c-filters
          .c-filters-inner
            legend.c-filters-legend Optional logs:
            label.checkbox
              input.input(type='checkbox' name='filter' v-model='form.filter' value='debug')
              i18n Debug
            label.checkbox
              input.input(type='checkbox' name='filter' v-model='form.filter' value='info')
              i18n Info
            label.checkbox
              input.input(type='checkbox' name='filter' v-model='form.filter' value='log')
              i18n Log

        button-submit.is-small.c-download(@click='downloadOrShareLogs')
          template(v-if='ephemeral.useWebShare')
            i.icon-share-alt.is-prefix
            i18n Share
          template(v-else)
            i.icon-download.is-prefix
            i18n Download

        a(ref='linkDownload' hidden)

      banner-scoped.c-err-banner(ref='errBanner')

      textarea.textarea.c-logs(ref='textarea' rows='12' readonly)
        | {{ prettyLogs }}

      i18n.link(tag='button' @click='openTroubleshooting') Troubleshooting

</template>

<script>
import sbp from '@sbp/sbp'
import { mapMutations } from 'vuex'
import { CAPTURED_LOGS } from '@utils/events.js'
import { MAX_LOG_ENTRIES } from '@utils/constants.js'
import safeLinkTag from '@view-utils/safeLinkTag.js'
import { L, LError } from '@common/common.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default ({
  name: 'AppLogs',
  components: {
    BannerScoped,
    ButtonSubmit
  },
  data () {
    return {
      form: {
        filter: this.$store.state.settings.appLogsFilter
      },
      ephemeral: {
        logs: [],
        useWebShare: false
      }
    }
  },
  created () {
    sbp('okTurtles.events/on', CAPTURED_LOGS, this.addLog)

    // Log entries in chronological order (oldest to most recent).
    this.ephemeral.logs = sbp('appLogs/get')
  },
  mounted () {
    window.addEventListener('resize', this.checkWebShareAvailable)
    this.checkWebShareAvailable()
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CAPTURED_LOGS)
    window.removeEventListener('resize', this.checkWebShareAvailable)
  },
  watch: {
    'form.filter' (filter) {
      this.setAppLogsFilter(filter)
    },
    prettyLogs () {
      this.$nextTick(() => {
        if (this.$refs.textarea) {
          // Automatically scroll the textarea to the bottom.
          this.$refs.textarea.scrollTop = this.$refs.textarea.scrollHeight
        }
      })
    }
  },
  computed: {
    errorMsg () {
      return this.$route.query.errorMsg
    },
    prettyLogs () {
      return this.ephemeral.logs
        .filter(({ type }) => this.form.filter.includes(type))
        .map(({ type, msg, timestamp }) => `${timestamp} [${type}] ${msg.map((x) => JSON.stringify(x)).join(' ')}`)
        .join('\n')
    },
    issuePageTag () {
      return safeLinkTag('ISSUE_PAGE')
    }
  },
  methods: {
    ...mapMutations([
      'setAppLogsFilter'
    ]),
    addLog (entry: Object) {
      if (entry) {
        this.ephemeral.logs.push(entry)
        // prevent the amount of logs from growing beyond MAX_LOG_ENTRIES
        // remove 100 excess logs each time we reach that amount
        if (this.ephemeral.logs.length >= MAX_LOG_ENTRIES + 100) {
          this.ephemeral.logs.splice(0, 100)
        }
      }
    },
    openTroubleshooting () {
      this.$router.push({
        query: {
          ...this.$route.query,
          tab: 'troubleshooting'
        }
      })
    },
    async downloadOrShareLogs () {
      const actionType = this.ephemeral.useWebShare ? 'share' : 'download'
      const isDownload = actionType === 'download'

      try {
        await sbp('appLogs/downloadOrShare',
          actionType,
          isDownload ? this.$refs.linkDownload : undefined
        )
      } catch (err) {
        const errorDisplay = isDownload
          ? L('Failed to download the app logs. {reportError}', LError(err))
          : L('Failed to share the app logs. {reportError}', LError(err))

        console.error(`AppLogs.vue downloadOrShareLogs() '${actionType}' action error:`, err)
        this.$refs.errBanner.danger(errorDisplay)
      }
    },
    checkWebShareAvailable () {
      this.ephemeral.useWebShare = Boolean(navigator.share) &&
        window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
        window.matchMedia('screen and (max-width: 1199px)').matches
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.settings-container {
  @include desktop {
    padding-top: 1.5rem;
  }
}

.c-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.c-instructions {
  margin-bottom: 1.5rem;
}

.c-filters {
  flex-grow: 99; // to be wider than c-download

  &-inner {
    display: flex;
  }

  &-legend {
    margin-right: 1.5rem;
  }

  .checkbox:last-child {
    margin-right: 1rem;
  }
}

.c-download {
  flex-grow: 1;
}

.c-filters,
.c-download,
.c-logs {
  margin-bottom: 1rem;
}

.c-logs {
  font-family: "Monaco", "Menlo", "Courier", monospace;
  font-size: $size_5;
  white-space: pre;
}

.c-err-banner {
  margin-bottom: 1.5rem;

  ::v-deep .c-banner {
    margin-top: 0;
  }
}
</style>
