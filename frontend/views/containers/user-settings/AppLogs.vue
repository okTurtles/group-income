<template lang='pug'>
  .settings-container
    section.card
      .c-header
        fieldset.c-filters
          legend.sr-only Visible logs
          label.checkbox
            input.input(type='checkbox' name='filter' v-model='filter' value='error')
            i18n Errors
          label.checkbox
            input.input(type='checkbox' name='filter' v-model='filter' value='warn')
            i18n Warnings
          label.checkbox
            input.input(type='checkbox' name='filter' v-model='filter' value='debug')
            i18n Debug

        button.is-small.c-download(@click='downloadLogs')
          i.icon-download.is-prefix.c-icon
          i18n.hide-touch Download
          i18n.hide-desktop Share
        a(ref='linkDownload' hidden)

      textarea.textarea.c-logs(ref='textarea' rows='12' readonly)
        | {{ prettyLog }}

      i18n.link(tag='a' @click='openTroubleshooting') Troubleshooting
      br
      br
      p.has-text-danger DELETE BEFORE MERGE!
      .buttons
        button.is-small.is-outlined(@click='_createLog("error")') Log error
        button.is-small.is-outlined(@click='_createLog("warn")') Log warn
        button.is-small.is-outlined(@click='_createLog("debug")') Log debug
        button.is-small.is-outlined(@click='_clearLogs') Clear Logs
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS, SET_APP_LOGS_FILTER } from '@utils/events.js'
import { downloadLogs, clearLogs } from '@model/captureLogs.js'
export default {
  name: 'AppLogs',
  components: {},
  data () {
    return {
      filter: [],
      logs: []
    }
  },
  mounted () {
    this.filter = this.ourUserIdentityContract.settings.appLogsFilter
    this.setLogs()
    sbp('okTurtles.events/on', CAPTURED_LOGS, this.addLog)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CAPTURED_LOGS)
  },
  watch: {
    async filter (value) {
      sbp('okTurtles.events/emit', SET_APP_LOGS_FILTER, value)
      await sbp('gi.actions/user/updateSettings',
        { appLogsFilter: value },
        this.$store.state.loggedIn.identityContractID
      )
    },
    prettyLog () {
      // Automatically scroll textarea to the bottom
      this.$nextTick(() => {
        if (this.$refs.textarea) {
          this.$refs.textarea.scrollTop = this.$refs.textarea.scrollHeight
        }
      })
    }
  },
  computed: {
    ...mapGetters([
      'ourUserIdentityContract'
    ]),
    prettyLog () {
      const isEntryNew = (type) => ['NEW_SESSION', 'NEW_VISIT'].includes(type)
      return this.logs
        .filter(({ type }) => {
          return this.filter.includes(type) || isEntryNew(type)
        })
        .map(({ type, msg }) => {
          return isEntryNew(type)
            ? `--------------- \n [${type}] :: ${msg}`
            : `[${type}] :: ${msg.map(something => JSON.stringify(something)).join(' ')}`
        })
        .join('\n')
    }
  },
  methods: {
    setLogs () {
      const logs = []
      let lastEntry = localStorage.getItem('giConsole/lastEntry')
      do {
        const entry = JSON.parse(localStorage.getItem(`giConsole/${lastEntry}`)) || {}
        logs.push(entry)
        lastEntry = entry.prev
      } while (lastEntry)
      this.logs = logs
    },
    addLog (logHash) {
      const entry = JSON.parse(localStorage.getItem(`giConsole/${logHash}`))
      if (entry) {
        this.logs.push(entry)
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
      this.logs = []
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
  @include tablet {
    padding-top: 1.5rem;
  }

  .c-title {
    margin-bottom: 1.5rem;
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
