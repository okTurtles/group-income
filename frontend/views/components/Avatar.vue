<template lang='pug'>
  img.c-avatar(
    v-if='imageURL'
    :class='`is-${size}`'
    :src='imageURL'
    :alt='alt'
    @load='revokeObjectURL'
    @error='revokeObjectURL'
    ref='img'
    v-on='$listeners'
    draggable='false'
  )
  .c-avatar.is-empty(v-else :class='`is-${size}`')
</template>

<script>
import sbp from '@sbp/sbp'
import { Secret } from 'libchelonia/Secret'

export default ({
  name: 'Avatar',
  props: {
    src: [String, Object], // acts as a placeholder when used together with blobURL
    alt: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    }
  },
  mounted () {
    console.log(`Avatar under ${this.$parent.$vnode.tag} blobURL:`, this.blobURL, 'src:', this.src)
    // typeof null === 'object', so both checks are needed
    if (this.src && typeof this.src === 'object') {
      this.downloadFile(this.src).catch((e) => {
        console.error('[Avatar.vue] Error in downloadFile', e)
      })
    }
  },
  beforeDestroy () {
    this.revokeObjectURL()
  },
  data () {
    return {
      revokableObjectURL: null,
      blobURL: null
    }
  },
  methods: {
    // See <https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications#using_object_urls>
    revokeObjectURL () {
      if (this.revokableObjectURL) {
        URL.revokeObjectURL(this.revokableObjectURL)
      }
      this.revokableObjectURL = null
    },
    setFromBlob (blob) {
      // this.revokeObjectURL()
      this.revokableObjectURL = this.blobURL = URL.createObjectURL(blob)
    },
    async downloadFile (src) {
      // convert Blob to/from ArrayBuffer for Safari compatibility
      // see: https://github.com/okTurtles/group-income/issues/2191
      const cachedArrayBuffer = await sbp('gi.db/filesCache/load', src.manifestCid).catch((e) => {
        console.error('[Avatar.vue] Error loading file from cache', e)
      })
      const cached = cachedArrayBuffer ? new Blob([cachedArrayBuffer]) : null
      if (src !== this.src) return
      if (cached) {
        this.setFromBlob(cached)
        return
      }
      try {
        const blob = await sbp('chelonia/fileDownload', new Secret(src))
        const arrayBuffer = await blob.arrayBuffer()
        sbp('gi.db/filesCache/save', src.manifestCid, arrayBuffer).catch((e) => {
          console.error('[Avatar.vue] Error caching avatar blob', e)
        })
        if (src !== this.src) return
        this.setFromBlob(blob)
      } catch (e) {
        console.error('[Avatar.vue] Error setting avatar blob', e)
      }
    }
  },
  watch: {
    src (to) {
      // NOTE: src could be null while logging out
      //       since typeof null === 'object', we should check if it's falsy
      if (to && typeof to === 'object') {
        this.downloadFile(to).catch((e) => {
          console.error('[Avatar.vue] Error in downloadFile', e)
        })
      }
    }
  },
  computed: {
    imageURL () {
      return this.blobURL || (typeof this.src === 'string' && this.src)
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

@mixin size($size) {
  width: $size;
  height: $size;
}

.c-avatar {
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;

  &::after {
    content: "";
    display: block;
    padding-bottom: 100%;
  }

  &.is-empty {
    background-color: $general_0;
  }

  &.is-xs { @include size(1.5rem); }
  &.is-sm { @include size(2rem); }
  &.is-md { @include size(2.5rem); }
  &.is-lg { @include size(4.5rem); }
  &.is-xl { @include size(8rem); }
}
</style>
