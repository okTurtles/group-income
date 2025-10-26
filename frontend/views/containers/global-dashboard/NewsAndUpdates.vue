<template lang='pug'>
.c-news-and-updates-container
  .c-loader-skeleton-container(v-if='isLoading')
    .c-skeleton-block(v-for='i in 2' :key='i')
      .c-loading-box.c-skeleton-date
      .c-loading-box.c-skeleton-card

  .c-error(v-else-if='errorMessage') {{ L('Failed to load news: {errorMessage}', { errorMessage }) }}
  template(v-else)
    .c-post-block(v-for='(post, index) in posts' :key='index')
      .c-post-created-date {{ humanDate(post.createdAt, { month: 'long', year: 'numeric', day: 'numeric' }) }}

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
import { humanDate } from '@model/contracts/shared/time.js'
import { mapGetters } from 'vuex'
import Avatar from '@components/Avatar.vue'
import RenderMessageWithMarkdown from '@containers/chatroom/chat-mentions/RenderMessageWithMarkdown.js'
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { fetchNews } from '@view-utils/misc.js'

export default ({
  name: 'NewAndUpdates',
  components: {
    Avatar,
    RenderMessageWithMarkdown
  },
  data () {
    return {
      posts: [],
      isLoading: true,
      errorMessage: null
    }
  },
  computed: {
    ...mapGetters(['ourIdentityContractId'])
  },
  async mounted () {
    await this.fetchNews()
    await this.markNewsAsSeen()
  },
  methods: {
    humanDate,
    async fetchNews () {
      try {
        this.isLoading = true
        this.errorMessage = null

        const data = await fetchNews()

        // Convert createdAt strings to Date objects for proper formatting
        this.posts = data.map(post => ({
          ...post,
          createdAt: new Date(post.createdAt)
        }))
      } catch (error) {
        console.error('Failed to fetch news:', error)
        this.errorMessage = error.message || L('Unknown error')
      } finally {
        this.isLoading = false
      }
    },
    async markNewsAsSeen () {
      // Update the last seen news date when user visits the page
      if (this.posts.length > 0 && this.ourIdentityContractId) {
        try {
          await sbp('gi.actions/identity/kv/updateLastSeenNewsDate', {
            lastSeenNewsDate: this.posts[0].createdAt.toISOString()
          })
        } catch (error) {
          console.error('Failed to update last seen news date:', error)
        }
      }
    }
  }
}: Object)
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
      background-color: var(--general_1);
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

@keyframes loading-heartbeat {
  0% { background-color: var(--general_1); }
  50% { background-color: var(--general_0); }
  100% { background-color: var(--general_1); }
}

.is-dark-theme {
  @keyframes loading-heartbeat {
    0% { opacity: 0.325; }
    50% { opacity: 1; }
    100% { opacity: 0.325; }
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
