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
              input.input(type='checkbox' name='filter' v-model='form.filter' value='info' checked)
              i18n Info
            label.checkbox
              input.input(type='checkbox' name='filter' v-model='form.filter' value='log' checked)
              i18n Log

        button.is-small.c-download(@click='downloadLogs')
          i.icon-download.is-prefix.c-icon
          i18n.hide-touch Download
          i18n.hide-desktop Share
        a(ref='linkDownload' hidden)

      textarea.textarea.c-logs(ref='textarea' rows='12' readonly)
        | {{ prettyLogs }}

      i18n.link(tag='button' @click='openTroubleshooting') Troubleshooting
</template>

<script>
import {
  sbp,
  CAPTURED_LOGS, SET_APP_LOGS_FILTER
} from '/assets/js/common.js' // eslint-disable-line import/no-absolute-path
import { mapState, mapMutations } from 'vuex'
import safeLinkTag from '@views/utils/safeLinkTag.js'
import { downloadLogs, getLog } from '~/frontend/model/captureLogs.js'

export default ({
  name: 'AppLogs',
  data () {
    return {
      form: {
        filter: []
      },
      ephemeral: {
        logs: []
      }
    }
  },
  created () {
    this.form.filter = this.appLogsFilter
    sbp('okTurtles.events/on', CAPTURED_LOGS, this.addLog)

    const logs = []
    let lastEntry = getLog('lastEntry')
    do {
      const entry = JSON.parse(getLog(lastEntry))
      if (!entry) break
      logs.push(entry)
      lastEntry = entry.prev
    } while (lastEntry)
    this.ephemeral.logs = logs.reverse() // chronological order (oldest to most recent)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CAPTURED_LOGS)
  },
  watch: {
    'form.filter' (filters) {
      this.setAppLogsFilters(filters)
      sbp('okTurtles.events/emit', SET_APP_LOGS_FILTER, filters)
    },
    prettyLogs () {
      this.$nextTick(() => {
        if (this.$refs.textarea) {
          // Automatically scroll textarea to the bottom
          this.$refs.textarea.scrollTop = this.$refs.textarea.scrollHeight
        }
      })
    }
  },
  computed: {
    ...mapState([
      'appLogsFilter'
    ]),
    errorMsg () {
      return this.$route.query.errorMsg
    },
    prettyLogs () {
      return this.ephemeral.logs
        .filter(({ type }) => this.form.filter.includes(type))
        .map(({ type, msg, timestamp }) => `${timestamp} [${type}] ${msg.map(JSON.stringify).join(' ')}`)
        .join('\n')
    },
    issuePageTag () {
      return safeLinkTag('ISSUE_PAGE')
    }
  },
  methods: {
    ...mapMutations([
      'setAppLogsFilters'
    ]),
    addLog (logHash) {
      const entry = JSON.parse(getLog(logHash))
      if (entry) {
        this.ephemeral.logs.push(entry)
      }
    },
    openTroubleshooting () {
      this.$router.push({
        query: {
          ...this.$route.query,
          section: 'troubleshooting'
        }
      })
    },
    downloadLogs () {
      downloadLogs(this.$refs.linkDownload)
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

  @include touch {
    .c-icon {
      &::before {
        content: "\f1e0"; // .icon-share-alt
      }
    }
  }
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
</style>
