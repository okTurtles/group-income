<template lang='pug'>
page
  h1.is-title-1 Cypress - Bypassing the UI
  p This page is used exclusively by Cypress to perform repetitive actions. &nbsp;
    a.link(href='https://docs.cypress.io/guides/getting-started/testing-your-app.html#Bypassing-your-UI' target='_blank') Read more about this strategy.
  br
  .card
    h2.is-title-2 Performing Action &nbsp;
      span.has-text-success(data-test='actionName') {{ ephemeral.action.name }}
    div(v-if='ephemeral.action.name')
      p.has-text-bold Queries:
      p.c-query {{ JSON.stringify(ephemeral.action.queries) }}
    div(v-else)
      p.has-text-1 Nothing at the moment...

    banner-scoped(ref='bannerAction')

    button.is-success.c-btn(
      v-if='ephemeral.isFinalized'
      data-test='finalizeBtn'
      @click='finalizeAction'
    ) Finalize action

  .card
    h3.is-title-2 Actions available
    p Pass the action name and its arguments as queries.
    p.has-text-1 Ex: /bypass-ui?action=user_signup&username=john&email=john@email.com&password=123456789
    ul.c-list
      li(v-for='(obj, actionName) in actions') {{ actionName }}
</template>

<script>
import sbp from '~/shared/sbp.js'
import Page from '@pages/Page.vue'
import BannerScoped from '@components/BannerScoped.vue'

export default {
  name: 'BypassUI',
  components: {
    Page,
    BannerScoped
  },
  data () {
    return {
      ephemeral: {
        action: {},
        isFinalized: false
      }
    }
  },
  async mounted () {
    const { action, ...queries } = this.$route.query

    if (!action) {
      return false
    }

    const { actionFn } = this.actions[action] || {}

    this.ephemeral.action = {
      name: action,
      queries
    }

    if (!actionFn) {
      // Wait for $refs.bannerAction to be mounted.
      this.$nextTick(() => {
        this.$refs.bannerAction.danger(`Action ${action} doesn't exist.`)
      })
      return
    }

    try {
      await actionFn(queries)

      // Use "isFinalized" so cypress can wait for the action to be succeded
      // And continue the tests correctly.
      this.ephemeral.isFinalized = true
      this.$refs.bannerAction.success(`${action} succeded!`)
    } catch (e) {
      this.$refs.bannerAction.danger(`Action ${action} failed. ${e.message}`)
    }
  },
  computed: {
    actions () {
      // NOTE: actions name are based on sbp selector.
      //       replace '/' by '_' to avoid url conflicts.
      //       ex: user/signup -> user_signup
      return {
        'user_signup': {
          actionFn: async (params) => {
            const username = this.$store.getters.ourUsername
            // QUESTION: Maybe we should do this validation inside sbp action...
            if (username) { throw Error(`You're signed as '${username}'. Logout first and re-run the tests.`) }
            await sbp('gi.actions/user/signupAndLogin', params)
          },
          finalize: () => {
            // Bug vue/no-side-effects-in-computed-properties
            //  -> https://github.com/vuejs/eslint-plugin-vue/issues/873
            this.$router.push({ path: '/app' }) // eslint-disable-line
          }
        },
        'user_login': {
          actionFn: async (params) => {
            const username = this.$store.getters.ourUsername
            if (username) { throw Error(`You're loggedin as '${username}'. Logout first and re-run the tests.`) }
            await sbp('gi.actions/user/login', params)
          },
          finalize: () => {
            this.$router.push({ path: '/app' }) // eslint-disable-line
          }
        },
        'group_create': {
          actionFn: async (params) => {
            await sbp('gi.actions/group/createAndSwitch', params, () => {
              return true
            })
          },
          finalize: () => {
            this.$router.push({ path: '/dashboard' }) // eslint-disable-line
          }
        }
      }
    }
  },
  methods: {
    finalizeAction () {
      const { action } = this.$route.query

      return this.actions[action].finalize()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-list {
  margin-top: $spacer;
  margin-left: $spacer;
  list-style-type: circle;
}

.c-query {
  word-break: break-all;
}

.c-btn {
  margin-top: $spacer;
}
</style>
