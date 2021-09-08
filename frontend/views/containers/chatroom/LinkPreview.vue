<template lang='pug'>
.c-link-preview
  a(v-if='response' :href='url' target='_blank')
    .c-wrapper
      .c-card-img
        img(:src='response.image')
      .c-card-info
        .c-card-text
          h1 {{response.title}}
          p {{response.description}}

</template>

<script>
export default {
  name: 'link-preview',
  props: {
    url: {
      type: String,
      required: true
    }
  },
  async created () {
    if (this.isValidUrl(this.url)) {
      try {
        const response = await fetch('https://www.linkpreview.net/', {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          referrerPolicy: 'no-referrer', // unsafe-url?
          body: 'url=' + this.url
        })
        response.then(data => {
          this.response = JSON.parse(data)
        })
      } catch (error) {
        console.log(error)
        this.response = null
        this.validUrl = false
      }
    }
  },
  data () {
    return {
      response: null,
      validUrl: false
    }
  },
  methods: {
    isValidUrl (url) {
      const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/
      this.validUrl = regex.test(url)
      return this.validUrl
    }
  }
}
</script>
