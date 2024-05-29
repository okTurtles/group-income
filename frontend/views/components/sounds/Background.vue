<template lang='pug'>
.c-bgsound-wrapper
  audio(ref='msgReceive' src='/assets/audio/msg-received.mp3' type='audio/mpeg')
  audio(ref='msgSend' src='/assets/audio/msg-sent.mp3' type='audio/mpeg')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { MESSAGE_RECEIVE, MESSAGE_SEND } from '@model/contracts/shared/constants.js'

export default ({
  name: 'BackgroundSounds',
  computed: {
    ...mapGetters(['isAppIdle'])
  },
  created () {
    sbp('okTurtles.events/on', MESSAGE_RECEIVE, this.playMessageReceive)
    sbp('okTurtles.events/on', MESSAGE_SEND, this.playMessageSend)
  },
  methods: {
    playMessageReceive () {
      if (this.isAppIdle) {
        this.$refs.msgReceive.play()
      }
    },
    playMessageSend () {
      if (this.isAppIdle) {
        this.$refs.msgSend.play()
      }
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
