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
    </p>
    <h1 class="title is-1">{{ group.groupName }}</h1>
    <p>{{ group.sharedValues }}</p>
    <h5 class="subtitle is-4"><i18n>Members</i18n></h5>
    <ul>
      <li v-for="member in group.members">{{ member }}</li>
    </ul>
    <a class="button invite-button" @click.prevent="invite(group.id)">
      <span class="icon"><i class='fa fa-plus'></i></span>
    </a>
  </section>
</template>

<style lang="sass" scoped>
  h1.title
    font-family: HelveticaNeue-Bold
    font-size: 52px
    color: #616161

  .invite-button
    border-radius: 999px
    background-color: #ECECEC
    color: #6CAD22
    height: 63px
    width: 63px
    .icon i
      font-size: 36px
</style>
