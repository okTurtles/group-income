<template>
  <div>
    <h1><i18n>Create Group</i18n></h1>
    <p><i18n>Group name:</i18n> {{ value.groupName }}</p>
    <p><i18n>Group purpose:</i18n> {{ value.sharedValues }}</p>
    <p><i18n>Minimum income:</i18n> {{ value.incomeProvided }}</p>
    <p><i18n>Group rules:</i18n></p>
    <ul>
      <li><i18n>Change Rules:</i18n> {{ value.changePercentage }}%</li>
      <li><i18n>Add Member:</i18n> {{ value.memberApprovalPercentage }}%</li>
      <li><i18n>Remove Member:</i18n> {{ value.memberRemovalPercentage }}%</li>
    </ul>
    <p><i18n>Members to invite:</i18n> <span v-for="invitee in value.invitees"> {{ invitee }} </span></p>
    </textarea>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupSummary',
  props: {
    value: {type: Object}
  }
}
</script>
