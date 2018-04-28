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
$spacer: 2rem;

.gi-title {
  padding-top: 2.5rem;
  padding-left: $spacer;
  margin-bottom: 0.5rem;
}

.list {
  &-item {
    padding: 0.4rem 0.4rem 0.4rem $spacer;
    font-weight: 600;

    &.is-active {
      background: #ededed;
      border-right: 3px solid orange;
    }
  }
}

.cta {
  display: block;
  padding-top: 0.25rem;
  padding-left: $spacer;
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
