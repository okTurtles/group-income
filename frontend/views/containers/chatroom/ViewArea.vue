<template lang='pug'>
.c-view-wrapper
  p.c-view-label
    span(v-safe-html='subTitle')
  .c-view-actions-wrapper
    button.button.is-small.is-outlined(
      @click='see'
      data-test='channelDescription'
    )
      i18n Channel Description
    button-submit.is-success.is-small(
      v-if='!joined'
      @click='join'
      data-test='joinChannel'
    )
      i18n Join Channel
</template>

<script>
import sbp from '@sbp/sbp'
import { mapState, mapGetters } from 'vuex'
import ButtonSubmit from '@components/ButtonSubmit.vue'
import { L, LTags } from '@common/common.js'

export default ({
  name: 'ViewArea',
  components: {
    ButtonSubmit
  },
  props: {
    title: String,
    joined: Boolean // false: not-yet-joined, true: joined-but-archived
  },
  computed: {
    ...mapState(['currentGroupId']),
    ...mapGetters(['currentChatRoomId']),
    subTitle () {
      return this.joined
        ? L('{b_} # {title}{_b} is archived', { title: this.title, ...LTags('b') })
        : L('You are viewing {b_} # {title}{_b}', { title: this.title, ...LTags('b') })
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
        alert(e.message)
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

    button:not(:first-child) {
      margin-left: 1rem;
      @include phone {
        margin-left: 0.5rem;
      }
    }
  }
}
</style>
