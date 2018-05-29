<template>
  <div>
    <h3 class="title is-7 is-uppercase gi-title">
      Your groups
    </h3>
    <ul class="list">
      <li class="list-item"
        :class='{"is-active": currentGroupId === group.contractId}'
        tabindex="0"
        v-for="group in groups"
        @click.prevent="changeGroup(group.contractId)"
      >
        {{ group.groupName }}
      </li>
    </ul>
    <router-link to="/new-group" class="cta">
      Create new group
    </router-link>
  </div>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/theme/index";

.gi-title {
  padding-top: $gi-spacer-lg;
  padding-left: $gi-spacer-lg;
  margin-bottom: $gi-spacer-sm;
}

.list {
  &-item {
    padding: 0.4rem 0.4rem 0.4rem $gi-spacer-lg;
    font-weight: 600;

    &:focus,
    &.is-active {
      background: #ededed;
      border-right: 3px solid orange;
      outline: none;
    }
  }
}

.cta {
  display: block;
  padding-top: $gi-spacer-xs;
  padding-left: $gi-spacer-lg;
}

</style>
<script>
export default {
  name: 'YourGroupsList',
  props: {
    groups: Array,
    currentGroupId: String
  },
  methods: {
    changeGroup (hash) {
      this.$store.commit('setCurrentGroupId', hash)
    }
  }
}
</script>
