<template lang='pug'>
.c-view-wrapper
  p.c-view-label
    span You are viewing
    b  #channel
  .c-view-actions-wrapper
    button.is-success(
      @click='join'
      data-test='joinChannel'
    ) Join Channel
    button(
      @click='see'
      data-test='seeDetails'
    ) See More Details
</template>

<script>
import sbp from '~/shared/sbp.js'
import { mapState } from 'vuex'

export default ({
  name: 'ViewArea',
  computed: {
    ...mapState([
      'currentChatRoomId',
      'currentGroupId',
      'loggedIn'
    ])
  },
  methods: {
    join: function () {
      // TODO: need to make button as button-submit
      try {
        sbp('gi.actions/group/joinChatRoom', {
          contractID: this.currentGroupId,
          data: {
            identityContractID: this.loggedIn.identityContractID,
            chatRoomID: this.currentChatRoomId
          }
        })
      } catch (e) {
        console.error('ViewArea join() error:', e)
      }
    },
    see: function () {
      console.log('TODO')
    }
  }
})
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-view-wrapper {
  background-color: $general_2;
  display: inline-flex;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  padding-top: 1rem;
  padding-bottom: 1rem;

  .c-view-label {
    text-align: center;
    font-size: 1rem;
  }

  .c-view-actions-wrapper {
    margin-top: 0.5rem;
    display: inline-flex;
    justify-content: center;

    button:first-child {
      margin-right: 1rem;
    }
  }
}
</style>
