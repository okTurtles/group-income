<template lang='pug'>
  .settings-container
    section.card
      h2.is-title-3.c-title Application logs

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
          i18n Download
          //- i18n.hide-touch Download
          //- i18n.hide-desktop Share
        a(ref='linkDownload' hidden)

      textarea.textarea.c-logs(ref='textarea' rows='12' readonly)
        | {{ prettyLog }}

      .buttons
        i18n.link(tag='a' @click='openTroubleshooting') Troubleshooting
        button.is-small.is-outlined(@click='clearLogs') Clear Logs
      br
      br
      p.has-text-danger DELETE BEFORE MERGE!
      .buttons
        button.is-small.is-outlined(@click='createLog("error")') Create error log
        button.is-small.is-outlined(@click='createLog("warn")') Create warn log
        button.is-small.is-outlined(@click='createLog("debug")') Create debug log
</template>

<script>
import sbp from '~/shared/sbp.js'
import { CAPTURED_LOGS } from '@utils/events.js'
import { downloadLogs } from '@view-utils/captureLogs.js'
export default {
  name: 'AppLogs',
  components: {},
  data () {
    return {
      filter: ['error', 'warn', 'debug'],
      prettyLog: null
    }
  },
  mounted () {
    this.updateFormLogs()
    sbp('okTurtles.events/on', CAPTURED_LOGS, this.updateFormLogs)
  },
  beforeDestroy () {
    sbp('okTurtles.events/off', CAPTURED_LOGS.CON, this.updateFormLogs)
  },
  watch: {
    filter: function () {
      this.updateFormLogs()
    }
  },
  methods: {
    createLog (type) {
      console[type](`This is a new log of type: ${type}.`, 'Heres an array to fill ~3Kb:', Array(200).fill(type))
    },
    openTroubleshooting () {
      alert('TODO link redirect. How to do this...')
    },
    downloadLogs () {
      downloadLogs('gi_logs.txt', this.$refs.linkDownload)
    },
    updateFormLogs () {
      const logs = JSON.parse(localStorage.getItem(CAPTURED_LOGS)) || []
      const isNewEntry = (type) => ['NEW_SESSION', 'NEW_VISIT'].includes(type)
      this.prettyLog = logs
        .filter(({ type }) => {
          return this.filter.includes(type) || isNewEntry(type)
        })
        .map(({ type, msg }) => {
          return isNewEntry(type)
            ? `--------------- \n [${type}] :: ${msg}`
            : `[${type}] :: ${msg.map(something => JSON.stringify(something)).join(' ')}`
        })
        .join('\n')

      this.$nextTick(() => {
        if (this.$refs.textarea) {
          this.$refs.textarea.scrollTop = this.$refs.textarea.scrollHeight
        }
      })
    },
    clearLogs () {
      if (confirm(this.L('Are you sure you want to delete all logs?'))) {
        localStorage.removeItem(CAPTURED_LOGS)
        this.prettyLog = ''
      }
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

  /* @include touch {
    .c-icon {
      &::before {
        content: "\f1e0", // .icon-share-alt
      }
    }
  } */
}

.c-filters,
.c-download,
.c-logs {
  margin-bottom: 1rem;
}

</style>
