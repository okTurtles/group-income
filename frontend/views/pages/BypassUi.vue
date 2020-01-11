<template lang='pug'>
page
  h1.is-title-1 Cypress - Bypass UI
  p This page is used exclusively by Cypress to perform repetitive actions. Here's a list of available queries and their subqueries:
  br
  .card
    p.is-title-3 Performing Action:
    div(v-if='ephemeral.action.name')
      p Action: {{ephemeral.action.name }}
      p Queries: {{ JSON.stringify(ephemeral.action.queries) }}

      banner-scoped(ref='bannerAction')
    div(v-else)
      p.has-text-1 Nothing at the moment...
      p _
  h2.is-title-3 signup
  p Queries: username, email
  p.has-text-1 Ex: /bypass-ui?action=signup&username=user-1&email=user1@email.com
</template>

<script>
import Page from '@pages/Page.vue'
import BannerScoped from '@components/BannerScoped.vue'
import { signup } from '../../actions/actions.js'

export default {
  name: 'BypassUi',
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

    this.ephemeral.action = {
      name: action,
      queries
    }

    const actionsAvailable = {
      signup: () => {
        console.log(signup)
        try {
          signup(queries, (err) => {
            if (err) {
              this.$refs.bannerAction.danger(`Action ${action} failed. Error:`, err.message)
            }
            this.$refs.bannerAction.success('Success!')
            this.$router.push({ path: '/app' })
          })
        } catch (err) {
          this.$refs.bannerAction.danger(`Action ${action} failed. Error:`, err.message)
        }
      }
    }

    // Wait for $refs.bannerAction to be ready.
    this.$nextTick(() => {
      actionsAvailable[action]()
    })
  },
  computed: {},
  methods: {}
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

</style>
