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
    <div class="columns">
      <div class="column is-2">
        <p>YOUR GROUPS</p>
      </div>
      <div class="column">
        <div class='is-pulled-right has-text-right'>
          <p class="min-income-label">Min Income</p>
          <p class="min-income">${{ group.incomeProvided}}</p>
          <a href="">Propose change</a>
        </div>
        <h1 class="title is-1">{{ group.groupName }}</h1>
        <p>{{ group.sharedValues }}</p>

        <!-- Members List  -->
        <h3 class="title is-3"><i18n>Members</i18n></h3>
        <ul>
          <li v-for="member in group.members">{{ member }}</li>
        </ul>
        <a class="button invite-button" @click.prevent="invite(group.id)">
          <span class="icon"><i class='fa fa-plus'></i></span>
        </a>

        <!-- Support History -->
        <h3 class="title is-3"><i18n>Support History</i18n></h3>
        <p>Your group was just started. This will update each month!</p>

        <!-- Group Settings -->
        <h3 class="title is-3"><i18n>Current Settings</i18n></h3>
        <div class="columns has-text-centered">
          <div class="column is-3">
            <p class="settings-number">{{ group.changePercentage }}%</p>
            <p class="settings-label">Change Rules</p>
            <a href="#">Propose change</a>
          </div>
          <div class="column is-3">
            <p class="settings-number">{{ group.memberApprovalPercentage }}%</p>
            <p class="settings-label">Add Member</p>
            <a href="#">Propose change</a>
          </div>
          <div class="column is-3">
            <p class="settings-number">{{ group.memberRemovalPercentage }}%</p>
            <p class="settings-label">Remove Member</p>
            <a href="#">Propose change</a>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<style lang="sass" scoped>
  h1.title
    font-family: HelveticaNeue-Bold
    font-size: 52px
    color: #616161

  h3.title
    margin-top: 30px

  .min-income-label
    font-family: HelveticaNeue-Light
    font-size: 16px
    color: #928E8E

  .min-income
    font-family: HelveticaNeue-Bold
    font-size: 48px
    color: #616161
    line-height: 45px

  .invite-button
    border-radius: 999px
    background-color: #ECECEC
    color: #6CAD22
    height: 63px
    width: 63px
    .icon i
      font-size: 36px

  .settings-number
    font-family: HelveticaNeue-Bold
    font-size: 72px
    color: #616161
    line-height: 64px

  .settings-label
    font-family: HelveticaNeue-Light
    font-size: 24px
    color: #616161
</style>
