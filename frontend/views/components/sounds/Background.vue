<template lang='pug'>
.c-bgsound-wrapper
  audio(ref='msgReceive' src='/assets/audio/msg-received.mp3' type='audio/mpeg')
  audio(ref='msgSend' src='/assets/audio/msg-sent.mp3' type='audio/mpeg')
</template>

<script>
import sbp from '@sbp/sbp'
import { MESSAGE_RECEIVE, MESSAGE_SEND } from '@model/contracts/shared/constants.js'
import isPwa from '@utils/isPwa.js'

export default ({
  name: 'BackgroundSounds',
  created () {
    sbp('okTurtles.events/on', MESSAGE_RECEIVE, this.playMessageReceive)
    sbp('okTurtles.events/on', MESSAGE_SEND, this.playMessageSend)
  },
  computed: {
    volumeFromStore () {
      return this.$store.getters.notificationVolume ?? 1 // The volume value in the store can be 0 too and we use it if that's the case.
    },
    isAppIdle () {
      // NOTE: idle-vue plugin will provide this.isAppIdle
      //       but sometimes it returns undefined, so redefine here
      return this.$store.state.idleVue?.isIdle || false
    }
  },
  methods: {
    shouldPlay (contractID: string) {
      if (isPwa()) { return false }

      const isTabInactive = () => {
        // document.hidden - when current tab is not active
        // document.hasFocus() - There is a case where current tab is open but the browser window itself is not in focus(In the background).
        //                       document.hasFocus() is used to catch this kind of case.
        return document.hidden || !document.hasFocus() 
      }

      // Check if the app is showing the target chatroom now.
      const isViewingThisChatroom = this.$route.name === 'GroupChatConversation' &&
        this.$route.params.chatRoomID === contractID

      // There are 3 cases where we want to play the sound:
      // 1) The current tab is inactive.
      // 2) The current tab is active but not showing the chatroom.
      // 3) The current tab is active and showing the chatroom but the app has been idle for a while.
      return (
        isTabInactive() ||
        !isViewingThisChatroom ||
        (isViewingThisChatroom && this.isAppIdle)
      )
    },
    playMessageReceive ({ contractID }: {
      contractID: string,
      messageHash: string,
      messageType: string
    }) {
      if (this.shouldPlay(contractID)) {
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
      // Update the audio elements accordingly when the volume change in the store is detected.
      this.updateAudioVolumes()
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";
</style>
