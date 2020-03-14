<template lang='pug'>
  .settings-container
    section.card
      h2.is-title-3.c-title Application logs

      .c-header
        fieldset
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

        i18n.is-small(tag='button' @click='downloadLogs') Download

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

export default {
  name: 'AppLogs',
  components: {},
  data () {
    return {
      filter: ['error'],
      prettyLog: null
    }
  },
  created () {
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
      console[type]('This is a new log of type:', type)
    },
    openTroubleshooting () {
      alert('TODO link redirect')
    },
    downloadLogs () {
      alert('TODO download the logs...')
    },
    updateFormLogs () {
      const logs = JSON.parse(localStorage.getItem(CAPTURED_LOGS)) || []
      this.prettyLog = logs
        .filter(({ type }) => {
          return this.filter.includes(type) || type === 'NEW_VISIT'
        })
        .map(({ type, msg }) => {
          return type === 'NEW_VISIT'
            ? `--------------- \n [${type}] :: ${msg}`
            : `[${type}] :: ${msg.map(something => JSON.stringify(something)).join(' ')}`
        })
        .join('\n')

      this.$nextTick(() => {
        this.$refs.textarea.scrollTop = this.$refs.textarea.scrollHeight
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
  justify-content: space-between;
}

.c-logs {
  margin: 1rem 0;
}

</style>
