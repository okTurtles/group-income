<template>
  <div>
    <h1 id="summaryStep" class="title is-1 has-text-centered"><i18n>Review & Finish</i18n></h1>

    <h2 class="title is-6"><i18n>Group name:</i18n></h2>
    <p class="subtitle is-2" v-if="group.groupName">{{ group.groupName }}</p>
    <p class="subtitle is-2 is-danger" v-else><i18n>No group name set</i18n></p>
    <p class="has-text-right">
      <router-link
        class="button is-primary"
        :to="{name: 'CreateGroupName'}"
      >
        <i18n>Edit</i18n>
      </router-link>
    </p>
    <hr>

    <h2 class="title is-6"><i18n>Group purpose:</i18n></h2>
    <p class="title is-4" v-if="group.sharedValues">{{ group.sharedValues }}</p>
    <p class="subtitle is-2 is-danger" v-else><i18n>No group purpose set</i18n></p>
    <p class="has-text-right">
      <router-link
        class="button is-primary"
        :to="{name: 'CreateGroupPurpose'}"
      >
        <i18n>Edit</i18n>
      </router-link>
    </p>
    <hr>

    <h2 class="title is-6"><i18n>Minimum income:</i18n></h2>
    <p class="subtitle is-2" v-if="group.incomeProvided">{{ currency }}{{ group.incomeProvided }}</p>
    <p class="subtitle is-2 is-danger" v-else><i18n>No group income set</i18n></p>
    <p class="has-text-right">
      <router-link
        class="button is-primary"
        :to="{name: 'CreateGroupMincome'}"
      >
        <i18n>Edit</i18n>
      </router-link>
    </p>
    <hr>

    <h2 class="title is-6"><i18n>Group rules:</i18n></h2>
    <div class="columns has-text-centered">
      <div class="column">
        <p class="percent">{{ group.changePercentage }}%</p>
        <p class="title is-5"><i18n>Change Rules</i18n></p>
      </div>
      <div class="column">
        <p class="percent">{{ group.memberApprovalPercentage }}%</p>
        <p class="title is-5"><i18n>Add Member</i18n></p>
      </div>
      <div class="column">
        <p class="percent">{{ group.memberRemovalPercentage }}%</p>
        <p class="title is-5"><i18n>Remove Member</i18n></p>
        </div>
    </div>
    <p class="has-text-right">
      <router-link
        class="button is-primary"
        :to="{name: 'CreateGroupRules'}"
      >
        <i18n>Edit</i18n>
      </router-link>
    </p>
    <hr>

    <h2 class="title is-6"><i18n>Members to invite:</i18n></h2>
    <p v-if="!group.invitees.length" class="subtitle is-2 is-warning"><i18n>Noone here yet</i18n></p>
    <div class="tile is-ancestor">
      <div class="tile is-4 is-parent" v-for="(invitee, index) in group.invitees">
        <div class="card tile is-child">
          <div class="card-image">
            <figure class="image is-square">
              <img :src="invitee.state.attributes.picture" :alt="invitee.state.attributes.name">
            </figure>
          </div>
          <header class="card-header">
            <p class="card-header-title">
              {{invitee.state.attributes.name}}
            </p>
          </header>
        </div>
      </div>
    </div>
    <p class="has-text-right">
      <router-link
        class="button is-primary"
        :to="{name: 'CreateGroupInvitees'}"
      >
        <i18n>Edit</i18n>
      </router-link>
    </p>
  </div>
</template>
<style>
  .tile.is-ancestor {
    flex-wrap: wrap;
  }
  .subtitle.is-2:not(.is-danger) {
    font-weight: bold;
  }
</style>
<script>
import { symbol } from '../../js/currencies'
export default {
  name: 'CreateGroupSummary',
  props: {
    group: {type: Object}
  },
  computed: {
    currency: function () {
      return symbol(this.group.incomeCurrency)
    }
  }
}
</script>
