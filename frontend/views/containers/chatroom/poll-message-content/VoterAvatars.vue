<template lang='pug'>
.c-voter-avatars(
  v-if='voters.length'
  @click='showTooltip'
  v-on-clickaway='closeTooltip'
)
  template(v-for='entry in votersToDisplay')
    .c-number-avatar(v-if='isNum(entry)') +{{ entry }}
    avatar-user.c-user-avatar(v-else :key='entry' :username='entry' size='xs')

  .c-voters-tooltip(
    :class='{ "is-active": ephemeral.isTooltipActive }'
  )
    .c-voters-tooltip-overlay(@click.stop='closeTooltip')

    .c-voters-tooltip-content
      header.c-voters-tooltip-header
        i18n.is-title-4.c-tooltip-title(
          tag='h2'
          :args='{ option: optionName }'
        ) Voted for “{option}”

        modal-close.c-tooltip-close-btn(@close='closeTooltip')

      ul.c-voters-list
        li.c-voter-item(v-for='(votername, index) in voters' :key='votername + index')
          avatar-user.c-voter-item-avatar(:username='votername' size='xs')
          span.c-voter-item-name {{ votername }}
</template>

<script>
import { mixin as clickaway } from 'vue-clickaway'
import AvatarUser from '@components/AvatarUser.vue'
import ModalClose from '@components/modal/ModalClose.vue'

export default ({
  name: 'VoterAvatars',
  mixins: [
    clickaway
  ],
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
    }
  },
  methods: {
    isNum (val) {
      return typeof val === 'number'
    },
    showTooltip () {
      if (!this.ephemeral.isTooltipActive) {
        this.ephemeral.isTooltipActive = true
      }
    },
    closeTooltip () {
      if (this.ephemeral.isTooltipActive) {
        this.ephemeral.isTooltipActive = false
      }
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

  &:hover > .c-number-avatar,
  &:hover > .c-user-avatar {
    box-shadow: 0 0 2px 1px $general_0;
  }
}

.c-number-avatar,
.c-user-avatar {
  flex-shrink: 0;
  transition: box-shadow 250ms linear;
  min-width: 1.5rem;
  cursor: pointer;

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
  z-index: $zindex-tooltip;
  background-color: $background_0;
  border-radius: 10px;
  display: none;
  pointer-events: none;

  &.is-active {
    display: block;
    pointer-events: initial;
  }

  &-content {
    max-height: 17.5rem;
    overflow-y: auto;
    height: max-content;
    background-color: $background_0;
    padding: 0 1rem 1.25rem;
    border-radius: 10px;
  }

  @include phone {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
    transform: translateY(0%);
    background-color: rgba(0, 0, 0, 0);

    &-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(10, 10, 10, 0.86);
    }

    &-content {
      position: absolute;
      border-radius: 10px 10px 0 0;
      width: 100%;
      max-height: 50vh;
      padding: 0 1rem 1.5rem;
      bottom: 0;
      left: 0;
      z-index: 1;
    }
  }

  @include from($tablet) {
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
  width: 1.75rem;
  height: 1.75rem;
  min-height: unset;
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
