<template lang='pug'>
page(
  pageTestName='GlobalDashboard'
  pageTestHeaderName='pageHeaderName'
)
  template(#title='') {{ L('News & Updates') }}

  .c-news-and-updates-container
    .c-loader-skeleton-container(v-if='isStatus("loading")')
      .c-skeleton-block(v-for='i in 2' :key='i')
        .c-loading-box.c-skeleton-date
        .c-loading-box.c-skeleton-card

    banner-scoped(v-else-if='isStatus("error")' ref='errorMsg' allow-a)

    template(v-else-if='isStatus("loaded")')
      .c-post-block(v-for='(post, index) in ephemeral.posts' :key='index')
        .c-post-created-date {{ displayDate(post.createdAt) }}

        .card.c-post-card
          .c-post-img-container
            avatar.c-post-img(
              src='/assets/images/group-income-icon-transparent-circle.png'
              alt='GI Logo'
              size='xs'
            )
          .c-post-content
            h3.is-title-4 {{ post.title }}
            render-message-with-markdown(:text='post.content')
</template>

<script>
import { mapGetters } from 'vuex'
import sbp from '@sbp/sbp'
import Page from '@components/Page.vue'
import Avatar from '@components/Avatar.vue'
import BannerScoped from '@components/banners/BannerScoped.vue'
import RenderMessageWithMarkdown from '@containers/chatroom/chat-mentions/RenderMessageWithMarkdown.js'
import { L, LError } from '@common/common.js'
import { fetchNews } from '@view-utils/misc.js'
import { humanDate } from '@model/contracts/shared/time.js'

export default {
  name: 'NewsAndUpdates',
  components: {
    Page,
    Avatar,
    BannerScoped,
    RenderMessageWithMarkdown
  },
  data () {
    return {
      ephemeral: {
        posts: [],
        loadStatus: ''
      }
    }
  },
  computed: {
    ...mapGetters(['ourIdentityContractId'])
  },
  methods: {
    displayDate (date) {
      return humanDate(date, { month: 'long', year: 'numeric', day: 'numeric' })
    },
    isStatus (status) {
      return this.ephemeral.loadStatus === status
    },
    async fetchNews () {
      try {
        this.ephemeral.loadStatus = 'loading'
        const data = await fetchNews()

        // Convert createdAt strings to Date objects for proper formatting
        this.ephemeral.posts = data.map(post => ({
          ...post,
          createdAt: new Date(post.createdAt)
        }))
        this.ephemeral.loadStatus = 'loaded'
      } catch (error) {
        this.ephemeral.loadStatus = 'error'
        console.error('Failed to fetch news:', error)

        this.$nextTick(() => {
          this.$refs.errorMsg.danger(L('Failed to load news: {reportError}', LError(error)))
        })
      }
    },
    async markNewsAsSeen () {
      // Update the last seen news date when user visits the page
      if (this.ephemeral.posts.length > 0 && this.ourIdentityContractId) {
        try {
          await sbp('gi.actions/identity/kv/updatePreference', {
            key: 'lastSeenNewsDate',
            value: this.ephemeral.posts[0].createdAt.toISOString()
          })
        } catch (error) {
          console.error('Failed to update last seen news date:', error)
        }
      }
    },
    async initComponent () {
      await this.fetchNews()
      await this.markNewsAsSeen()
    }
  },
  mounted () {
    this.initComponent()
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-loading,
.c-error {
  padding: 2rem;
  text-align: center;
  color: $text_1;
}

.c-loader-skeleton-container {
  position: relative;
  display: block;

  .c-skeleton-block {
    display: block;

    &:not(:last-of-type) {
      margin-bottom: 4rem;
    }

    .c-loading-box {
      animation: loading-heartbeat 3s linear infinite;
      background-color: $general_1;
      opacity: 0.625;
    }

    .c-skeleton-date {
      margin-bottom: 0.625rem;
      width: 8.75rem;
      min-height: 0;
      height: 1.25rem;
      border-radius: $radius-large;
    }

    .c-skeleton-card {
      width: 100%;
      min-height: 0;
      height: 10rem;
      border-radius: $radius-large;
    }
  }
}

.c-error {
  color: $danger_0;
}

.c-post-block {
  position: relative;
  width: 100%;
  margin-bottom: 2rem;
}

.c-post-created-date {
  padding-left: 1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.c-post-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.5rem;

  .c-post-img-container {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background-color: $general_2;
    flex-shrink: 0;
  }

  .c-post-content {
    flex-grow: 1;

    h3 {
      margin-bottom: 0.5rem;
    }
  }
}
</style>
