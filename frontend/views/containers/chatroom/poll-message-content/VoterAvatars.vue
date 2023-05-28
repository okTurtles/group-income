<template lang='pug'>
.c-voter-avatars(v-if='voters.length')
  template(v-for='entry in votersToDisplay')
    .c-number-avatar(v-if='isNum(entry)') +{{ entry }}
    avatar-user.c-user-avatar(v-else :key='entry' :username='entry' size='xs')

  .c-voters-tooltip
    header.c-voters-tooltip-header
      i18n.is-title-4.c-tooltip-title(
        tag='h2'
        :args='{ option: optionName }'
      ) Voted for “{option}”

      modal-close.c-tooltip-close-btn

    ul.c-voters-list
      li.c-voter-item(v-for='votername in tooltipVoters' :key='votername')
        avatar-user.c-voter-item-avatar(:username='votername' size='xs')
        span.c-voter-item-name {{ votername }}
</template>

<script>
import AvatarUser from '@components/AvatarUser.vue'
import ModalClose from '@components/modal/ModalClose.vue'

export default ({
  name: 'VoterAvatars',
  components: {
    AvatarUser,
    ModalClose
  },
  data () {
    return {
      ephemeral: {
        isTooltipActive: false
      }
    }
  },
  props: {
    voters: Array,
    optionName: String
  },
  computed: {
    votersToDisplay () {
      const restNum = this.voters.length - 2

      return [
        restNum > 0 && restNum,
        ...this.voters.slice(0, 2)
      ].filter(Boolean)
    },
    tooltipVoters () {
      const list = []
      
      for (let i=0; i<20; i++) {
        list.push(this.voters[0])
      }
      return list
    }
  },
  methods: {
    isNum (val) {
      return typeof val === 'number'
    },
    showTooltip () {
      this.ephemeral.isTooltipActive = true
    },
    closeTooltip () {
      this.ephemeral.isTooltipActive = false
    }
  }
}: Object)
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-voter-avatars {
  position: relative;
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  width: max-content;
  cursor: pointer;

  &:hover > * {
    box-shadow: 0 0 2px 1px $general_0;
  }
}

.c-number-avatar,
.c-user-avatar {
  flex-shrink: 0;
  transition: box-shadow 250ms linear;
  min-width: 1.5rem;

  &:not(:last-child) {
    margin-left: -0.375rem;
  }
}

.c-user-avatar {
  border: 2px solid $background_0;
}

.c-number-avatar {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-size: $size_5;
  color: $text_0;
  background-color: $general_1;
}

.c-voters-tooltip {
  position: absolute;
  top: -1rem;
  right: 0;
  transform: translateY(-100%);
  width: 17.5rem;
  height: max-content;
  border-radius: 10px;
  padding: 0 1rem 1.5rem;
  background-color: $background_0;
  overflow-y: auto;
  z-index: $zindex-tooltip;

  @include from($tablet) {
    max-height: 17.5rem;
    padding: 0 1rem 1.25rem;
    box-shadow: 0 0 20px rgba(219, 219, 219, 0.6);

    .is-dark-theme & {
      box-shadow: 0 0 20px rgba(38, 38, 38, 0.625);
    }
  }
}

.c-voters-tooltip-header {
  position: sticky;
  top: 0;
  left: 0;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: $background_0;
}

.c-tooltip-title {
  margin-right: 0.75rem;
}

button.c-tooltip-close-btn {
  position: relative;
  top: unset;
  right: unset;
  left: unset;

  @include from($tablet) {
    width: 1.75rem;
    height: 1.75rem;
    min-height: unset;
  }
}

.c-voter-item {
  display: flex;
  align-items: flex-start;

  &:not(:last-of-type) {
    margin-bottom: 0.75rem;
  }

  &-avatar {
    margin-right: 0.5rem;
  }

  &-name {
    font-size: $size_4;
    color: $text_0;
    line-height: 1.4;
  }
}
</style>
