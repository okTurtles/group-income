<template lang='pug'>
.c-view-wrapper
  p.c-view-label
    i18n(
      :args='{title: title, ...LTags("b")}'
    ) You are viewing {b_} # {title}{_b}
  .c-view-actions-wrapper
    button-submit.is-success.is-small(
      @click='join'
      data-test='joinChannel'
    )
      i18n Join Channel
</template>

<script>
import sbp from '@sbp/sbp'
import { L } from '@common/common.js'
import { mapState, mapGetters } from 'vuex'
import ButtonSubmit from '@components/ButtonSubmit.vue'

export default ({
  name: 'ViewArea',
  components: {
    ButtonSubmit
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['currentChatRoomId'])
  },
  props: {
    title: {
      type: String
    },
    joined: {
      type: Boolean
    }
  },
  methods: {
    join: async function () {
      try {
        await sbp('gi.actions/group/joinChatRoom', {
          contractID: this.currentGroupId,
          data: { chatRoomID: this.currentChatRoomId }
        })
      } catch (e) {
        const promptOptions = {
          heading: L('Failed to join the chatroom'),
          question: L("Couldn't join the chatroom An error occurred: {error}", { error: e.message }),
          primaryButton: L('Close')
        }

        await sbp('gi.ui/prompt', promptOptions)
        console.error('ViewArea join() error:', e)
      }
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
  padding-top: 2rem;
  padding-bottom: 2.5rem;

  @include phone {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .c-view-label {
    text-align: center;
    font-size: 1rem;
  }

  .c-view-actions-wrapper {
    margin-top: 1.5rem;
    display: inline-flex;
    justify-content: center;

    @include phone {
      margin-top: 1rem;
    }

    button:first-child {
      margin-right: 1rem;
      @include phone {
        margin-right: 0.5rem;
      }
    }
  }
}
</style>
