<template lang='pug'>
ul.c-group-list(v-if='groupsByName.length')
  li.c-group-list-item.group-badge(
    v-for='(group, index) in groupsByName'
    :key='`group-${index}`'
    tag='button'
    :class="{ 'is-active': currentGroupId === group.contractID}"
  )
    avatar.c-avatar(
      src='/assets/images/default-avatar.png'
      :alt='group.groupName'
      :blobURL='group.groupPicture'
      @click="handleMenuSelect(group.contractID)"
    )

  li.c-group-list-item
    router-link.c-group-create(
      to='/new-group/name'
      alt='L("Create a new group")'
    )
      i.icon-plus.is-size-4

</template>

<script>
import { mapGetters, mapState } from 'vuex'
import Avatar from '@components/Avatar.vue'

export default {
  name: 'GroupsList',
  components: {
    Avatar
  },
  computed: {
    ...mapState([
      'currentGroupId'
    ]),
    ...mapGetters([
      'groupSettings',
      'groupsByName'
    ])
  },
  methods: {
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
@import "../../../assets/style/_variables.scss";

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
  position: relative;
  z-index: 1;
}

.c-group-create {
  background: white;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  i {
    transition: transform .25s ease-out;
  }

  &:hover {
    background-color: $general_0;

    i {
      transform: rotate(180deg);
      color: $white;
    }
  }
}
</style>
