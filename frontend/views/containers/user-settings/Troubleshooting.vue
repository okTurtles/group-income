<template lang='pug'>
  .c-troubleshooting-container
    section.card
      i18n.is-title-3(tag='h3') Re-sync and rebuild data
      p.c-desc.has-text-1
        i18n If you're having trouble with the app, you can try resetting Group Income. This will delete the current app state, and log you out. After you log back in, it may take a few minutes for the app to reset, but that should fix most problems. THIS WILL LOG YOU OUT.
        i18n.link.c-link(tag='button' @click='openAppLogs') For diagnostic info, see application logs.

      banner-scoped(ref='doneMsg' data-test='doneMsg')

      .c-cta-container
        i18n.c-cta(
          v-if='ephemeral.status !== "recovering"'
          tag='button'
          @click='startResync'
        ) Reset Group Income
</template>

<script>
import { L, LError } from '@common/common.js'
import sbp from '@sbp/sbp'
import { mapState } from 'vuex'
import BannerScoped from '@components/banners/BannerScoped.vue'
import BannerSimple from '@components/banners/BannerSimple.vue'
import ProgressBar from '@components/graphs/Progress.vue'
import { logExceptNavigationDuplicated } from '@view-utils/misc.js'

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
  },
  computed: {
    ...mapState([
      'appLogsFilter'
    ])
  },
  methods: {
    openAppLogs () {
      this.$router.push({ path: '/user-settings/application-logs' }).catch(logExceptNavigationDuplicated)
    },
    async startResync () {
      const confirmString = L(`This will reset Group Income and log you out.

You will need to log back in with your password and wait for a bit while the app's state is being rebuilt from scratch.

Are you sure?`)
      if (this.ephemeral.status === 'ok' && !confirm(confirmString)) {
        return null
      }

      try {
        this.ephemeral.status = 'recovering'
        await sbp('gi.actions/identity/logout', null, true)
        this.ephemeral.status = 'ok'
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

.c-cta-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  row-gap: 0.5rem;
}

.c-coming-soon {
  display: inline-flex;
  align-items: center;
  color: $text_1;
  user-select: none;

  i {
    margin-right: 0.2rem;
  }
}

.c-link {
  display: inline-block;
  margin-left: 0.25rem;
}
</style>
