<script>
import GroupMembers from '../components/GroupMembers.vue'
import GroupSettings from '../components/GroupSettings.vue'

export default {
  name: 'GroupDashboard',
  computed: {
    group () {
      return this.$store.getters.currentGroup
    }
  },
  components: {
    GroupMembers,
    GroupSettings
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

        <group-members :group="group" />

        <!-- Support History -->
        <h3 class="title is-3"><i18n>Support History</i18n></h3>
        <p>Your group is still in its first month.</p>

        <group-settings :group="group" />

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
</style>
