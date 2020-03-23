<template lang='pug'>
  .settings-container
    section.card
      .c-header
        fieldset.c-filters
          legend.sr-only Visible logs
          label.checkbox
            input.input(type='checkbox' name='filter' v-model='form.filter' value='error')
            i18n Errors
          label.checkbox
            input.input(type='checkbox' name='filter' v-model='form.filter' value='warn')
            i18n Warnings
          label.checkbox
            input.input(type='checkbox' name='filter' v-model='form.filter' value='debug')
            i18n Debug

        button.is-small.c-download(@click='downloadLogs')
          i.icon-download.is-prefix.c-icon
          i18n.hide-touch Download
          i18n.hide-desktop Share
        a(ref='linkDownload' hidden)

      textarea.textarea.c-logs(ref='textarea' rows='12' readonly)
        | {{ prettyLogs }}

      i18n.link(tag='a' @click='openTroubleshooting') Troubleshooting
      br
      br
      p.has-text-danger DELETE BEFORE MERGE!
      .buttons
        button.is-small.is-outlined(@click='_createLog("error")') Log error
        button.is-small.is-outlined(@click='_createLog("warn")') Log warn
        button.is-small.is-outlined(@click='_createLog("debug")') Log debug
        button.is-small.is-outlined(@click='_createLog("log")') Log log
        button.is-small.is-outlined(@click='_createLog("info")') Log info
        button.is-small.is-outlined(@click='_clearLogs') Clear Logs
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS, SET_APP_LOGS_FILTER } from '@utils/events.js'
import { downloadLogs, clearLogs } from '@model/captureLogs.js'
export default {
  name: 'AppLogs',
  components: {},
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
    let lastEntry = localStorage.getItem('giConsole/lastEntry')
    do {
      const entry = JSON.parse(localStorage.getItem(`giConsole/${lastEntry}`)) || {}
      if (!entry) break
      logs.push(entry)
      lastEntry = entry.prev
    } while (lastEntry)
    this.ephemeral.logs = logs.reverse()
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CAPTURED_LOGS)
  },
  watch: {
    async 'form.filter' (filters) {
      console.log('filttter', filters)
      if (!filters) return

      // update Vuex state with new filters
      this.setAppLogsFilters(filters)
      // and save the new settings on localStorage
      await this.saveSettings()
      sbp('okTurtles.events/emit', SET_APP_LOGS_FILTER, filters)
    },
    prettyLogs () {
      // Automatically scroll textarea to the bottom
      this.$nextTick(() => {
        if (this.$refs.textarea) {
          this.$refs.textarea.scrollTop = this.$refs.textarea.scrollHeight
        }
      })
    }
  },
  computed: {
    ...mapState([
      'appLogsFilter'
    ]),
    prettyLogs () {
      const isEntryNew = (type) => ['NEW_SESSION', 'NEW_VISIT'].includes(type)
      return this.ephemeral.logs
        .filter(({ type }) => {
          return this.form.filter.includes(type) || isEntryNew(type)
        })
        .map(({ type, msg }) => {
          return isEntryNew(type)
            ? `--------------- \n [${type}] ${msg}`
            : `[${type}] ${msg.map(part => JSON.stringify(part)).join(' ')}`
        })
        .join('\n')
    }
  },
  methods: {
    ...mapMutations([
      'setAppLogsFilters'
    ]),
    ...mapActions([
      'saveSettings'
    ]),
    addLog (logHash) {
      const entry = JSON.parse(localStorage.getItem(`giConsole/${logHash}`))
      if (entry) {
        this.ephemeral.logs.push(entry)
      }
    },
    openTroubleshooting () {
      alert('TODO link redirect. How to do this...')
      // this.$router.push({
      //   query: {
      //     ...this.$route.query,
      //     section: 'troubleshooting'
      //   }
      // })
    },
    downloadLogs () {
      downloadLogs('gi_logs.txt', this.$refs.linkDownload)
    },
    // DELETE BEFORE MERGE
    _clearLogs () {
      clearLogs()
      this.ephemeral.logs = []
    },
    _createLog (type) {
      console[type]('This is a new log of type:', type)
    }
  }
}
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
  justify-content: space-between;
}

.c-filters {
  flex-grow: 99; // to be wider than c-download.
}

.c-download {
  flex-grow: 1;

  @include touch {
    .c-icon {
      &::before {
        content: "\f1e0", // .icon-share-alt
      }
    }
  }
}

.c-filters,
.c-download,
.c-logs {
  margin-bottom: 1rem;
}

</style>
