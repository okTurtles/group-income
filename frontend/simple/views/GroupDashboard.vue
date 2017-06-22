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
  <section class="container section">
    <p class='is-pulled-right'>
      <a class="button is-primary" @click.prevent="invite(group.id)">
        <span class="icon is-small"><i class='fa fa-plus mr-sm'></i></span>
        <span><i18n>Invite members</i18n></span>
      </a>
    </p>
    <h1 class="title is-1 mb-none">{{ group.groupName }}</h1>
    <p class="mb-lg"><small><i18n>SHARED VALUES:</i18n></small> {{ group.sharedValues }}</p>
    <h5 class="subtitle is-4"><i18n>Members</i18n></h5>
    <ul>
      <li v-for="member in group.members">{{ member }}</li>
    </ul>
  </section>
</template>

<style lang="sass" scoped>
</style>
