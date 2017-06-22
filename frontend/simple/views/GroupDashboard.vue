<script>
export default {
  name: 'GroupDashboard',
  computed: {
    group () {
      return this.$store.getters.currentGroup
    }
  },
  methods: {
    invite (groupId) {
      this.$store.commit('setCurrentGroupId', groupId)
      this.$router.push({path: '/invite'})
    }
  }
}
</script>

<template>
  <section class="container">
    <p class='is-pulled-right'>
      <a class="button is-primary" @click.prevent="invite(group.id)">
        <i class='fa fa-plus mr-sm'></i>
        Invite members
      </a>
    </p>
    <h1 class="title is-1 mb-none">{{ group.groupName }}</h1>
    <p class="text-light mb-lg"><small>{{ group.id }}</small></p>
    <p class="mb-lg">{{ group.sharedValues }}</p>
    <h5 class="subtitle is-4">Members</h5>
    <ul>
      <li v-for="member in group.members">{{ member }}</li>
    </ul>
  </section>
</template>

<style lang="sass" scoped>
</style>
