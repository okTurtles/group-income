<template lang='pug'>
.c-bgsound-wrapper
  audio(ref='msgReceive' src='/assets/audio/msg-received.mp3' type='audio/mpeg')
  audio(ref='msgSend' src='/assets/audio/msg-sent.mp3' type='audio/mpeg')
</template>

<script>
import sbp from '@sbp/sbp'
import { mapGetters } from 'vuex'
import { MESSAGE_RECEIVE, MESSAGE_SEND } from '@model/contracts/shared/constants.js'
import isPwa from '@utils/isPwa.js'

export default ({
  name: 'BackgroundSounds',
  created () {
    sbp('okTurtles.events/on', MESSAGE_RECEIVE, this.playMessageReceive)
    sbp('okTurtles.events/on', MESSAGE_SEND, this.playMessageSend)
  },
  computed: {
    ...mapGetters(['ourPreferences']),
    volumeFromStore () {
      return this.ourPreferences.notificationVolume || 1
    },
    isAppIdle () {
      // NOTE: idle-vue plugin will provide this.isAppIdle
      //       but sometimes it returns undefined, so redefine here
      return this.$store.state.idleVue?.isIdle
    }
  },
  methods: {
    shouldPlay () {
      return !isPwa() && (document.hidden || this.isAppIdle)
    },
    playMessageReceive () {
      if (this.shouldPlay()) {
        this.$refs.msgReceive.play()
      }
    },
    playMessageSend () {
      if (this.shouldPlay()) {
        this.$refs.msgSend.play()
      }
    },
    updateAudioVolumes () {
      this.$refs.msgReceive.volume = this.volumeFromStore
      this.$refs.msgSend.volume = this.volumeFromStore
    }
  },
  mounted () {
    this.updateAudioVolumes()
  },
  watch: {
    volumeFromStore () {
      this.updateAudioVolumes()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
