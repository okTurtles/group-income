<template lang='pug'>
  .settings-container
    section.card
      i18n.is-title-3(tag='h3') Re-sync and rebuild data
      p.c-desc.has-text-1
        i18n All of your information is stored locally, on your personal device, and encrypted when sent {over the network, to other group members}. Re-syncing will download the latest version of the group's information.
        | &nbsp;
        i18n.link(tag='button' @click='openAppLogs') See application logs

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
        .c-progress
          progress-bar(:max='1' :value='ephemeral.progress.percentage')
          .c-progress-desc.has-text-1(aria-label='polite')
            span {{ephemeral.progress.part}}
            span {{ephemeral.progress.percentage * 100}} %

      banner-scoped(ref='doneMsg' data-test='doneMsg')

      i18n.c-cta(
        v-if='ephemeral.status !== "recovering"'
        tag='button'
        @click='startResync'
      ) Re-sync
</template>

<script>
import {
  L, LError
} from '@common/common.js'
import { mapState } from 'vuex'
import BannerScoped from '@components/banners/BannerScoped.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import ProgressBar from '@components/graphs/Progress.vue'

export default ({
  name: 'Troubleshooting',
  components: {
    BannerScoped,
    BannerSimple,
    ProgressBar
  },
  data () {
    return {
      config: {
        ok: {
          statusText: L('Ok'),
          style: 'success'
        },
        corrupted: {
          statusText: L('Corrupted'),
          style: 'danger'
        }
      },
      ephemeral: {
        status: 'ok', //  'ok' | 'corrupted' | 'recovering' | 'failed'
        sizeMb: '', // e.g. '9Mb'
        statusText: '', //  Corrupted | Ok
        style: '', // danger | success
        progress: {
          part: '', // e.g. 'Downloading...'
          percentage: 0 // Number: e.g. 0.75
        }
      }
    }
  },
  created () {
    // TODO #761
    const status = 'ok' // 'ok' or 'corrupted'

    this.ephemeral.status = status
    this.ephemeral.statusText = this.config[status].statusText
    this.ephemeral.style = this.config[status].style

    this.ephemeral.sizeMb = '9Mb' // TODO this
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
      if (this.ephemeral.status === 'ok' && !confirm(L('Are you sure you want to re-sync your app data? This might take a few minutes.'))) {
        return null
      }

      this.ephemeral.status = 'recovering'
      this.$refs.doneMsg.clean()

      try {
        // Dummy logic, obviously.
        this.updateProgress(L('Deleting local data...'), 0.25)
        await this.dummy3secTask()
        this.updateProgress(L('Downloading new data...'), 0.50)
        await this.dummy3secTask()
        this.updateProgress(L('Last touches...'), 0.90)

        // Change false to true to force a dummy error
        if (false) { // eslint-disable-line
          throw Error('Dummy error forced')
        }

        await this.dummy3secTask()

        // All done!
        this.ephemeral.status = 'ok'
        this.updateProgress('', 1)

        this.$refs.doneMsg.success(L('Your local contract version is synced! All the app functionality was restored!'))
        this.ephemeral.statusText = this.config.ok.statusText
        this.ephemeral.style = this.config.ok.style
      } catch (e) {
        this.ephemeral.status = 'failed'
        this.$refs.doneMsg.danger(L('Re-sync failed. {reportError}', LError(e)))
      }
    },
    updateProgress (part, percentage) {
      this.ephemeral.progress.part = part
      this.ephemeral.progress.percentage = percentage
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

.c-banner,
.c-progress,
.c-cta {
  margin-top: 1.5rem;
}

.c-progress {
  &-desc {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
  }
}

</style>
