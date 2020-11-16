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
const apiUrl = 'https://www.linkpreview.net/'
export default {
  name: 'link-preview',
  props: {
    url: {
      type: String,
      required: true
    }
  },
  created () {
    if (this.isValidUrl(this.url)) {
      this.httpRequest(
        response => {
          this.response = JSON.parse(response)
        }, () => {
          this.response = null
          this.validUrl = false
        }
      )
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
    },
    httpRequest (success, error) {
      const http = new XMLHttpRequest()
      const params = 'url=' + this.url
      http.open('POST', apiUrl, true)
      http.setRequestHeader(
        'Content-type',
        'application/x-www-form-urlencoded'
      )
      http.onreadystatechange = () => {
        if (http.readyState === 4) {
          if (http.status === 200) success(http.responseText)
          if (http.status === 500) error()
        }
      }
      http.send(params)
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
