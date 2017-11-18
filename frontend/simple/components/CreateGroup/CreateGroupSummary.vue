<template>
  <div>
    <h1><i18n>Create Group</i18n></h1>
    <p><i18n>Group name:</i18n> {{ group.groupName }}</p>
    <p><i18n>Group purpose:</i18n> {{ group.sharedValues }}</p>
    <p><i18n>Minimum income:</i18n> {{ group.incomeProvided }}</p>
    <p><i18n>Group rules:</i18n></p>
    <ul>
      <li><i18n>Change Rules:</i18n> {{ group.changePercentage }}%</li>
      <li><i18n>Add Member:</i18n> {{ group.memberApprovalPercentage }}%</li>
      <li><i18n>Remove Member:</i18n> {{ group.memberRemovalPercentage }}%</li>
    </ul>
    <p><i18n>Members to invite:</i18n> <span v-for="invitee in group.invitees"> {{ invitee.state.attributes.name }} </span></p>
    </textarea>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupSummary',
  props: {
    group: {type: Object}
  }
}
</script>
