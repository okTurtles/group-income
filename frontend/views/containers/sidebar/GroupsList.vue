<template lang='pug'>
ul.c-group-list(v-if='groupsByName.length')
  li.c-group-list-item.group-badge(
    v-for='(group, index) in groupsByName'
    :key='`group-${index}`'
    tag='button'
    :class='{ "is-active": currentGroupId === group.contractID}'
  )
    tooltip(
      direction='right'
      :text='group.groupName'
    )
      button.c-group-picture.is-unstyled(@click='handleMenuSelect(group.contractID)')
        avatar.c-avatar(
          :src='$store.state[group.contractID].settings.groupPicture'
        )

  li.c-group-list-item
    tooltip(
      direction='right'
      :text='L("Create a new group")'
    )
      button(
        class='is-icon has-background'
        @click='openModal("CreateGroup")'
        data-test='createGroup'
        :aria-label='L("Add a group")'
      )
        i.icon-plus
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import Avatar from '@components/Avatar.vue'
import Tooltip from '@components/Tooltip.vue'
import sbp from '~/shared/sbp.js'
import { OPEN_MODAL } from '@utils/events.js'

export default {
  name: 'GroupsList',
  components: {
    Avatar,
    Tooltip
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupsByName'
    ])
  },
  methods: {
    openModal (mode) {
      sbp('okTurtles.events/emit', OPEN_MODAL, mode)
    },
    handleMenuSelect (id) {
      id && this.changeGroup(id)
    },
    changeGroup (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-group-list {
  width: 3.5rem;
  padding-top: 0.7rem;
  background-color: $general_1;
}

.c-group-list-item {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 3.2rem;
  margin-bottom: 0.25rem;
}

.group-badge {
  &::before {
    content: "";
    position: absolute;
    width: 3rem;
    height: 3rem;
    border: 1px solid transparent;
    border-radius: 50%;
    transform: scale(0.7);
    transition: all .25s cubic-bezier(0.18, 0.89, 0.32, 1.38);
  }

  &.is-active {
    &::before {
      transform: scale(1);
      border-color: $text_0;
      animation: spin 0.5s ease-out;
    }
  }

  &:not(.is-active) {
    cursor: pointer;
    &:focus::before
    &:hover::before {
      border-color: $white;
      border-width: 3px;
      transform: scale(1.1);
    }
  }
}

@keyframes spin {
  0%{transform: rotate(45deg); filter:hue-rotate(0deg); border-color: $primary_0 transparent transparent; };
  50%{transform: rotate(315deg); filter:hue-rotate(360deg); border-color: $primary_0 transparent transparent;};
  100%{ transform: rotate(585deg); border-color: $white;}
}

.c-avatar {
  width: 2.5rem;
  height: 2.5rem;
  position: relative;
  z-index: 1;
}

.c-group-picture {
  display: flex;
}
</style>
