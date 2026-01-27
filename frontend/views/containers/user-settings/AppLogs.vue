<template lang='pug'>
  .c-app-logs-container
    section.card
      .c-loader-container(v-if='ephemeral.versionInfos.loading')
        .loading-box
        .loading-box
        .loading-box
        .loading-box

      template(v-else)
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

          fieldset.c-source(:aria-label='L("Source:")')
            .c-source-inner
              label.c-label
                i18n.c-source-legend Log source:
                .selectbox
                  select.select(v-model='form.source')
                    option(value='combined')
                      i18n Combined
                    option(value='browser')
                      i18n Browser
                    option(value='serviceworker')
                      i18n Service worker

          button-submit.is-small.c-download(@click='downloadOrShareLogs')
            template(v-if='ephemeral.useWebShare')
              i.icon-share-alt.is-prefix
              i18n Share
            template(v-else)
              i.icon-download.is-prefix
              i18n Download

          a(ref='linkDownload' hidden)

        banner-scoped.c-err-banner(ref='errBanner')

        textarea.textarea.c-logs(ref='textarea' rows='12' v-if='ephemeral.ready' readonly)
          | {{ prettyLogs }}
        div(v-else)
          i18n Loading

        i18n.link(tag='button' @click='openTroubleshooting') Troubleshooting

</template>

<script>
import sbp from '@sbp/sbp'
import { mapMutations } from 'vuex'
import { CAPTURED_LOGS } from '@utils/events.js'
import { MAX_LOG_ENTRIES } from '@utils/constants.js'
import safeLinkTag from '@view-utils/safeLinkTag.js'
import { L, LError } from '@common/common.js'
import { omit } from 'turtledash'
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
        filter: this.$store.state.settings.appLogsFilter,
        source: 'combined'
      },
      ephemeral: {
        ready: false,
        logs: [],
        useWebShare: false,
        versionInfos: {
          loading: true,
          app_version: '',
          contracts_version: '',
          service_worker_version: ''
        }
      }
    }
  },
  created () {
    sbp('okTurtles.events/on', CAPTURED_LOGS, this.addLog)
    this.getLogs()
    this.loadVersionInfo()
  },
  mounted () {
    window.addEventListener('resize', this.checkWebShareAvailable)
    this.checkWebShareAvailable()
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CAPTURED_LOGS, this.addLog)
    window.removeEventListener('resize', this.checkWebShareAvailable)
  },
  watch: {
    'form.filter' (filter) {
      this.setAppLogsFilter(filter)
    },
    'form.source' (to, from) {
      if (to === from) return
      this.getLogs()
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
        .map(({ type, source, msg, timestamp }) => `${timestamp} (${source}) [${type}] ${msg.map((x) => JSON.stringify(x)).join(' ')}`)
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
    async loadVersionInfo () {
      let swVersion = ''

      try {
        swVersion = (await sbp('sw/version')).GI_GIT_VERSION.slice(1)
      } catch (e) {
        console.error('AppLogs.vue caught:', e)
      } finally {
        this.ephemeral.versionInfos = {
          loading: false,
          app_version: process.env.GI_VERSION.split('@')[0],
          contracts_version: process.env.CONTRACTS_VERSION,
          service_worker_version: swVersion
        }
      }
    },
    addLog (entry: Object) {
      if (entry) {
        if (this.form.source === 'browser' && entry.source !== 'browser') return
        if (this.form.source === 'serviceworker' && entry.source !== 'sw') return
        this.ephemeral.logs.push(entry)
        // prevent the amount of logs from growing beyond MAX_LOG_ENTRIES
        // plus 100 lines. If the log entries get too large, remove 100 excess
        // logs each time we reach that amount
        // NOTE: When viewing 'combined' logs, we allow for twice as many log
        // entries.
        const maxEntries = this.form.source === 'combined' ? 2 * MAX_LOG_ENTRIES : MAX_LOG_ENTRIES
        if (this.ephemeral.logs.length >= maxEntries + 100) {
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
    downloadOrShareLogs () {
      const actionType = this.ephemeral.useWebShare ? 'share' : 'download'
      const isDownload = actionType === 'download'

      try {
        const elLink = this.$refs.linkDownload
        const filename = 'gi_logs.json.txt'
        const mimeType = 'text/plain'

        const blob = new Blob([JSON.stringify({
        // Add instructions in case the user opens the file.
          _instructions: 'GROUP INCOME - Application Logs - Attach this file when reporting an issue: https://github.com/okTurtles/group-income/issues',
          ua: navigator.userAgent,
          version_info: omit(this.ephemeral.versionInfos, ['loading']),
          logs: this.ephemeral.logs
        }, undefined, 2)], { type: mimeType })

        if (isDownload) {
          if (!elLink) { return }

          const url = URL.createObjectURL(blob)
          elLink.href = url
          elLink.download = filename
          elLink.click()
          setTimeout(() => {
            elLink.href = '#'
            URL.revokeObjectURL(url)
          }, 0)
        } else {
          return navigator.share({
            files: [new File([blob], filename, { type: blob.type })],
            title: L('Application Logs')
          })
        }
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
    },
    getLogs () {
      // Log entries in chronological order (oldest to most recent).
      switch (this.form.source) {
        case 'combined': {
          this.ephemeral.ready = false
          const tempLogs = []
          this.ephemeral.logs = tempLogs
          sbp('swLogs/get').then((logs) => {
            // This check ensures that we're not working on a stale request
            // If the reference to this.ephemeral.logs has changed, it means
            // that we shouldn't proceed because a newer user action has occurred
            if (this.ephemeral.logs !== tempLogs) {
              return
            }
            const appLogs = sbp('appLogs/get')
            const combinedLogs = [...appLogs, ...logs].sort()
            this.ephemeral.logs = combinedLogs
            this.ephemeral.ready = true
          }).catch(err => {
            const errorDisplay = L('Error obtaining logs. {reportError}', LError(err))

            console.error('AppLogs.vue getLogs() error:', err)
            this.$refs.errBanner.danger(errorDisplay)
          })
          break
        }
        case 'browser': {
          this.ephemeral.logs = sbp('appLogs/get')
          this.ephemeral.ready = true
          break
        }
        case 'serviceworker': {
          this.ephemeral.ready = false
          const tempLogs = []
          this.ephemeral.logs = tempLogs
          sbp('swLogs/get').then((logs) => {
            // This check ensures that we're not working on a stale request
            // If the reference to this.ephemeral.logs has changed, it means
            // that we shouldn't proceed because a newer user action has occurred
            if (this.ephemeral.logs !== tempLogs) {
              return
            }
            this.ephemeral.logs = logs
            this.ephemeral.ready = true
          }).catch(err => {
            const errorDisplay = L('Error obtaining logs. {reportError}', LError(err))

            console.error('AppLogs.vue getLogs() error:', err)
            this.$refs.errBanner.danger(errorDisplay)
          })
          break
        }
      }
    }
  }
}: Object)
</script>

<style lang='scss' scoped>
@import "@assets/style/_variables.scss";

.c-app-logs-container {
  width: 100%;
}

.c-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.c-instructions {
  margin-bottom: 1.5rem;
  width: 100%;
}

.c-filters,
.c-source {
  width: 100%;
  flex-grow: 99; // to be wider than c-download

  &-inner {
    display: flex;
  }

  &-legend::after {
    content: "\2003";
  }

  .checkbox:last-child::after {
    content: "\2002";
  }
}

.c-source .c-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.c-download {
  flex-grow: 1;
}

.c-filters,
.c-source,
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

.c-loader-container {
  position: relative;
  width: 100%;

  .loading-box {
    display: block;
    width: 100%;
    min-height: unset;

    &:first-child {
      height: 1.25rem;
      max-width: 20rem;
    }

    &:nth-child(2),
    &:nth-child(3) {
      height: 1.25rem;
    }

    &:nth-child(2) { max-width: 31.25rem; }

    &:last-child { height: 16.25rem; }
  }
}
</style>
