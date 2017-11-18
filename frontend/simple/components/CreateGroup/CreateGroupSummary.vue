<template>
  <div>
    <h1><i18n>Create Group</i18n></h1>
    <div>
      <h2><i18n>Group name:</i18n></h2>
      <p>{{ group.groupName }}</p>
      <router-link :to="{name: 'CreateGroupName'}">
        <i18n>Edit</i18n>
      </router-link>
    </div>
    <div>
      <h2><i18n>Group purpose:</i18n></h2>
      <p>{{ group.sharedValues }}</p>
      <router-link :to="{name: 'CreateGroupPurpose'}">
        <i18n>Edit</i18n>
      </router-link>
    </div>
    <div>
      <h2><i18n>Minimum income:</i18n></h2>
      <p>{{ group.incomeProvided }}</p>
      <router-link :to="{name: 'CreateGroupMincome'}">
        <i18n>Edit</i18n>
      </router-link>
    </div>
    <div>
      <h2><i18n>Group rules:</i18n></h2>
    </div>
    <ul>
      <li><i18n>Change Rules:</i18n> {{ group.changePercentage }}%</li>
      <li><i18n>Add Member:</i18n> {{ group.memberApprovalPercentage }}%</li>
      <li><i18n>Remove Member:</i18n> {{ group.memberRemovalPercentage }}%</li>
    </ul>
    <router-link :to="{name: 'CreateGroupRules'}">
      <i18n>Edit</i18n>
    </router-link>
    <div>
      <h2><i18n>Members to invite:</i18n></h2>
      <p><span v-for="invitee in group.invitees"> {{ invitee.state.attributes.name }} </span></p>
      <router-link :to="{name: 'CreateGroupInvitees'}">
        <i18n>Edit</i18n>
      </router-link>
    </div>
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
