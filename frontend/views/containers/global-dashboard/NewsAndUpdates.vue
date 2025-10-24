<template lang='pug'>
.c-news-and-updates-container
  .c-loading(v-if='isLoading') {{ L('Loading news...') }}
  .c-error(v-else-if='error') {{ L('Failed to load news. Please try again later.') }}
  .c-post-block(v-else v-for='(post, index) in posts' :key='index')
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
      error: false
    }
  },
  computed: {
    ...mapGetters(['ourIdentityContractId', 'currentIdentityState'])
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
        this.error = false

        const response = await fetch('https://groupincome.org/news.json')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Convert createdAt strings to Date objects for proper formatting
        this.posts = data.map(post => ({
          ...post,
          createdAt: new Date(post.createdAt)
        }))
      } catch (error) {
        console.error('Failed to fetch news:', error)
        this.error = true
      } finally {
        this.isLoading = false
      }
    },
    async markNewsAsSeen () {
      // Update the last seen news date when user visits the page
      if (this.posts.length > 0 && this.ourIdentityContractId) {
        const latestNewsDate = this.posts[0].createdAt.toISOString()
        try {
          const getUpdatedPreferences = ({ etag, currentData: currentPreferences = {} } = {}) => {
            return [{ ...currentPreferences, lastSeenNewsDate: latestNewsDate }, etag]
          }

          const data = getUpdatedPreferences()[0]
          await sbp('gi.actions/identity/kv/savePreferences', { data, onconflict: getUpdatedPreferences })
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
