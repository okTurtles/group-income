<template>
  <section>
    <!-- Group Settings -->
    <h3 class="title is-3"><i18n>Current Settings</i18n></h3>
    <div class="columns has-text-centered">
      <div class="column is-3">
        <p id="changePercentage" class="settings-number">{{ group.changePercentage }}%</p>
        <p class="settings-label">Change Rules</p>
        <a href="#">Propose change</a>
      </div>
      <div class="column is-3">
        <p id="approvePercentage" class="settings-number">{{ group.memberApprovalPercentage }}%</p>
        <p class="settings-label">Add Member</p>
        <a href="#">Propose change</a>
      </div>
      <div class="column is-3">
        <p id="removePercentage" class="settings-number">{{ group.memberRemovalPercentage }}%</p>
        <p class="settings-label">Remove Member</p>
        <a href="#">Propose change</a>
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
h3.title {
  margin-top: 30px;
}

.settings-number {
  font-family: HelveticaNeue-Bold;
  font-size: 72px;
  color: #616161;
  line-height: 64px;
}

.settings-label {
  font-family: HelveticaNeue-Light;
  font-size: 24px;
  color: #616161;
}
</style>
<script>
  export default {
    name: 'GroupSettings',
    props: {
      group: Object
    }
  }
</script>
