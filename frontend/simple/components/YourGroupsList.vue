<template>
  <div>
    <h3 class="list-title">YOUR GROUPS</h3>
    <p class="group-name"
      v-for="group in groups"
      :class='{"is-active": currentGroupId === group.contractId}'
      @click.prevent="changeGroup(group.contractId)"
    >
      {{ group.groupName }}
    </p>
    <router-link class="create-new-link" to="/new-group">+ CREATE NEW</router-link>
  </div>
</template>
<style lang="scss" scoped>
.list-title {
  color: #9b9b9b;
  font-family: HelveticaNeue-Light;
  font-size: 14px;
  letter-spacing: 5px;
  margin-bottom: 13px;
}

.group-name {
  color: #616161;
  font-family: HelveticaNeue-Bold;
  font-size: 17px;
  overflow: hidden;
  padding: 5px 0;
}

.group-name:hover {
  color: #222324;
  cursor: pointer;
}

.group-name.is-active {
  background: #ececec;
  padding-left: 15px;
  margin-left: -15px;
}

.create-new-link {
  color: #9b9b9b;
  display: block;
  font-family: HelveticaNeue-Bold;
  font-size: 12px;
  letter-spacing: 3.43px;
  margin-top: 13px;

  &:hover {
    color: #222324;
  }
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

