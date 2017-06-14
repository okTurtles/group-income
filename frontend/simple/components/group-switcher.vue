<script>
export default {
  name: 'GroupSwitcher',
  props: {
    groups: Array,
    currentGroupId: String
  },
  methods: {
    changeGroup (e) {
      const hash = e.target.value
      this.$store.commit('setCurrentGroupId', hash)
    }
  }
}
</script>

<template>
  <div class="field">
    <p class="control">
      <span class="select">
        <select @change="changeGroup" v-model="currentGroupId">
          <option v-for="group in groups" :value="group.contractId">
            {{ group.groupName }}
          </option>
        </select>
      </span>
    </p>
  </div>
</template>
