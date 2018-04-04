<template>
  <div class="notification is-centered po-container">
    Progress Overview on the way.
	</div>
</template>

<script>
  export default {
    name: 'ProgressOverview',
    props: {
      who: String,
      what: String,
      change: String,
      votesCount: Number
    }
  }
</script>

<style lang="scss" scoped>
  .po-container {
    margin: 3rem 0;
  }
</style>
