<template lang='pug'>
.p-wrapper(v-if='type===500')
  h1.is-title-1.p-title 500
  i18n.is-title-3.c-title(tag='h2') Server error
  i18n.c-text(tag='p') We are having some trouble. Please try again later.
  i18n.is-outlined.is-small.c-retry-btn(
    v-if='ephemeral.isOnline'
    tag='button'
    @click='onRetryClick'
  ) Retry

.p-wrapper(v-else)
  h1.is-title-1.p-title 404
  i18n.is-title-3.c-title(tag='h2') Page not found
  i18n.c-text(tag='p') We couldn’t find what you are looking for.
  router-link.button(to='/')
    i18n Take me home
</template>

<script>
export default ({
  name: 'ErrorPage',
  props: {
    type: {
      type: Number,
      default: 500
    }
  },
  data () {
    return {
      ephemeral: {
        isOnline: null // show 'Retry' button only when the browser is online
      }
    }
  },
  methods: {
    onlineHandler () {
      this.ephemeral.isOnline = true
    },
    offlineHandler () {
      this.ephemeral.isOnline = false
    },
    onRetryClick () {
      window.location.reload()
    }
  },
  mounted () {
    if (navigator.onLine === true) {
      this.onlineHandler()
    }

    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)
  },
  beforeDestory () {
    window.removeEventListener('online', this.onlineHandler)
    window.removeEventListener('offline', this.offlineHandler)
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.p-wrapper {
  display: flex;
  flex-direction: column;
  text-align: center;
  justify-content: center;
  align-items: center;
}

.c-title {
  margin-bottom: 0.5rem;
}

.c-text {
  color: $text_1;

  & + .button {
    align-self: center;
    margin-top: 2rem;
  }
}

.c-retry-btn {
  width: max-content;
}
</style>
