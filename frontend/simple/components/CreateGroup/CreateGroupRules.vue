<template>
  <div id="rulesStep" class="has-text-centered">
    <h1 class="title is-2"><i18n>Group Advanced Rules</i18n></h1>
    <p class="content"><i18n>What percentage approval is necessary to adjust the group rules?</i18n></p>
    <div class="columns">
      <div class="column">
        <p class="percent" v-if="!form.editChange">{{ group.changePercentage }}%</p>
        <div class="field" v-if="form.editChange">
          <div class="control">
            <input
              class="input is-large"
              type="number"
              min="1"
              max="100"
              name="changePercentage"
              :value="group.changePercentage"
              @input="update"
            />
          </div>
        </div>
        <p class="title is-5"><i18n>Change Rules</i18n></p>
        <button class="button is-link is-6 subtitle" @click="() => toggle('editChange')"><i18n>Change</i18n></button>
      </div>
      <div class="column">
        <p class="percent" v-if="!form.editApprove">{{ group.memberApprovalPercentage }}%</p>
        <div class="field" v-if="form.editApprove">
          <div class="control">
            <input
              class="input is-large"
              type="number"
              min="1"
              max="100"
              name="memberApprovalPercentage"
              :value="group.memberApprovalPercentage"
              @input="update"
            />
          </div>
        </div>
        <p class="title is-5"><i18n>Add Member</i18n></p>
        <button class="button is-link is-6 subtitle" @click="() => toggle('editApprove')"><i18n>Change</i18n></button>
      </div>
      <div class="column">
        <p class="percent" v-if="!form.editRemove">{{ group.memberRemovalPercentage }}%</p>
        <div class="field" v-if="form.editRemove">
          <div class="control">
            <input
              class="input is-large"
              type="number"
              min="1"
              max="100"
              name="memberRemovalPercentage"
              :value="group.memberRemovalPercentage"
              @input="update"
            />
          </div>
        </div>
        <p class="title is-5"><i18n>Remove Member</i18n></p>
        <button class="button is-link is-6 subtitle" @click="() => toggle('editRemove')"><i18n>Change</i18n></button>
      </div>
    </div>
  </div>
</template>
<style>
  .percent {
    font-size: 3rem;
    font-weight: bold;
    line-height: 3.4rem;
    margin-bottom: 0.75rem;
  }
</style>
<script>
export default {
  name: 'CreateGroupRules',
  props: {
    group: {type: Object}
  },
  methods: {
    update (e) {
      this.$emit('input', {
        data: {
          [e.target.name]: parseInt(e.target.value)
        },
        validity: {
          [e.target.name]: e.target.validity.valid
        }
      })
    },
    toggle (field) {
      this.form[field] = !this.form[field]
    }
  },
  data () {
    return {
      form: {
        editChange: false,
        editApprove: false,
        editRemove: false
      }
    }
  }
}
</script>
