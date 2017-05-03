<template>
  <div class="field">
    <p class="control">
      <span class="select">
        <select>
          <option v-for="group in groups" value="group.groupName">{{ group.groupName }}</option>
        </select>
      </span>
    </p>
  </div>
</template>

<script>
export default {
  name: 'GroupSwitcher',
  props: {
    groups: Array,
    currentGroupId: String
  }
}
</script>
