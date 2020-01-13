<template lang='pug'>
page
  h1.is-title-1 Cypress - Bypassing the UI
  p This page is used exclusively by Cypress to perform repetitive actions. &nbsp;
    a.link(href='https://docs.cypress.io/guides/getting-started/testing-your-app.html#Bypassing-your-UI') Read more about this strategy.
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

  .card
    h3.is-title-2 Actions available
    p Pass the action name and its arguments as queries.
    p.has-text-1 Ex: /bypass-ui?action=signup&username=john&email=john@email.com&password=123456789
    ul.c-list
      li(v-for='action in Object.keys(actions())') {{ action }}
</template>

<script>
import Page from '@pages/Page.vue'
import BannerScoped from '@components/BannerScoped.vue'
import signup from '../../actions/signup.js'
import login from '../../actions/login.js'
import groupCreation from '../../actions/groupCreation.js'

export default {
  name: 'BypassUI',
  components: {
    Page,
    BannerScoped
  },
  data () {
    return {
      ephemeral: {
        action: {}
      }
    }
  },
  mounted () {
    const { action, ...queries } = this.$route.query

    if (!action) {
      return false
    }

    const { actionFn, finalize } = this.actions()[action] || {}

    // Wait for $refs.bannerAction to be ready.
    this.$nextTick(async () => {
      if (!actionFn) {
        this.$refs.bannerAction.danger(`Action ${action} doesn't exist.`)
      }

      this.ephemeral.action = {
        name: action,
        queries
      }

      try {
        await actionFn(queries)
        this.$refs.bannerAction.success(`${action} success!`)
        finalize()
      } catch (err) {
        this.$refs.bannerAction.danger(`Action ${action} failed. ${err.message}`)
      }
    })
  },
  methods: {
    actions () {
      return {
        signup: {
          actionFn: signup,
          finalize: () => {
            this.$router.push({ path: '/app' })
          }
        },
        login: {
          actionFn: login,
          finalize: () => {
            this.$router.push({ path: '/app' })
          }
        },
        groupCreation: {
          actionFn: groupCreation,
          finalize: () => {
            this.$router.push({ path: '/dashboard' })
          }
        }
      }
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
</style>
