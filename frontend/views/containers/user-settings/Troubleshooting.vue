<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-3(tag='h3') Re-sync and rebuild data

      p.c-desc.has-text-1
        i18n All of your information is stored locally, on your personal device, and encrypted when sent {over the network, to other group members}. Re-syncing will download the latest version of the group's information.
        | &nbsp;
        i18n.link(tag='button' @click='openAppLogs') See application logs.

      ul.c-legend
        li.c-legend-item
          i18n Total space used
          strong.c-legend-dd {{ ephemeral.sizeMb }}
        li.c-legend-item
          i18n Status
          strong.c-legend-dd {{ ephemeral.statusText }}
          .c-marker(:class='`has-background-${ephemeral.style}-solid`')

      template(v-if='ephemeral.status === "corrupted"')
        banner-simple.c-banner(data-test='corruptedMsg' severity='danger')
          i18n Please use the re-sync option below to restore functionality.
      template(v-else-if='ephemeral.status === "recovering"')
        p [progress bar on the way!]
        | {{ephemeral.progress.part}}
        | {{ephemeral.progress.percentage}}

      banner-scoped(ref='doneMsg' data-test='doneMsg')

      i18n.c-cta(
        v-if='ephemeral.status !== "recovering"'
        tag='button'
        @click='startResync'
      ) Re-sync
</template>

<script>
import { mapState } from 'vuex'
import L, { LError } from '@view-utils/translations.js'
import BannerScoped from '@components/banners/BannerScoped.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'

// import sbp from '~/shared/sbp.js'

export default {
  name: 'Troubleshooting',
  components: {
    BannerScoped,
    BannerSimple
  },
  data () {
    return {
      ephemeral: {
        status: 'ok', //  'ok' | 'corrupted' | 'recovering' | 'done'
        sizeMb: '', // e.g. '9Mb'
        statusText: '', //  Corrupted | Ok
        style: '', // danger | success
        progress: {
          part: '', // e.g. 'Downloading...'
          percentage: '' // e.g. '0.75'
        }
      }
    }
  },
  created () {
    const dummyStatus = 'corrupted' // 'ok' or 'corrupted'

    const mapData = {
      corrupted: {
        statusText: L('Corrupted'),
        style: 'danger'
      },
      ok: {
        statusText: L('Ok'),
        style: 'success'
      }
    }

    this.ephemeral.status = dummyStatus
    this.ephemeral.statusText = mapData[dummyStatus].statusText
    this.ephemeral.style = mapData[dummyStatus].style
    // Get dummy size Mb.
    this.ephemeral.sizeMb = '9Mb'
  },
  computed: {
    ...mapState([
      'appLogsFilter'
    ])
  },
  methods: {
    openAppLogs () {
      this.$router.push({
        query: {
          ...this.$route.query,
          section: 'application-logs'
        }
      })
    },
    dummy3secTask () {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 3000)
      })
    },
    async startResync () {
      this.ephemeral.status = 'recovering'
      this.$refs.doneMsg.clean()

      // Dummy logic, obviously.
      this.updateProgress(L('Deleting local data...'), 0.25)

      await this.dummy3secTask()

      this.updateProgress(L('Downloading new data...'), 0.50)

      await this.dummy3secTask()

      this.updateProgress(L('Last touches...'), 0.75)

      await this.dummy3secTask()

      // Done!
      this.ephemeral.status = 'done'
      this.updateProgress('', '')

      // Success or failure
      if (1 === 1) { // eslint-disable-line
        this.$refs.doneMsg.success(L('Your local contract version is synced! All the app functionality was restored!'))
      } else {
        const e = Error
        this.$refs.doneMsg.danger(L('Re-sync failed. Make sure you are online and try again. {reportError}', LError(e)))
      }
    },
    updateProgress (part, percentage) {
      this.ephemeral.progress.part = part
      this.ephemeral.progress.percentage = percentage
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

.c-desc {
  margin: 1rem 0;
}

.c-legend {
  display: flex;

  &-item {
    margin-right: 2.5rem;

    @include phone {
      margin-right: 1.5rem;
    }
  }

  &-dd {
    font-family: "Poppins";
    font-weight: 600;
    margin-left: 0.5rem;
  }
}

.c-marker {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  margin-left: 0.5rem;
  margin-bottom: 0.06rem; // visually aligned
  border-radius: 1px;
  border: 1px solid;

  &.has-background-success-solid {
    border-color: $success_0;
  }

  &.has-background-danger-solid {
    border-color: $danger_0;
  }
}

.c-banner {
  margin-top: 1.5rem;
}

.c-cta {
  margin-top: 1.5rem;
}

</style>
