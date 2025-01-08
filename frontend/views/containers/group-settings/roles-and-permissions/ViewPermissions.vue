<template lang="pug">
.c-permissions-wrapper
  span.c-display-text.has-text-1 {{ displayText }}
  i18n.link.c-see-all(tag='button') See all
</template>

<script>
import { L } from '@common/common.js'
import { getPermissionDisplayName } from './permissions-utils.js'

export default {
  name: 'ViewPermissions',
  props: {
    permissions: {
      type: Array
    }
  },
  computed: {
    displayText () {
      const p = this.permissions || []
      const len = p.length

      return len === 1
        ? getPermissionDisplayName(p[0])
        : len > 1
          ? L("'{first}' and {restCount} more", { first: getPermissionDisplayName(p[0]), restCount: len - 1 })
          : ''
    }
  },
  methods: {
    getPermissionDisplayName
  }
}
</script>

<style lang="scss" scoped>
@import "@assets/style/_variables.scss";

.c-permissions-wrapper {
  position: relative;
  padding: 0.75rem 0.5rem 0.75rem 0;
}

.c-display-text {
  font-size: $size_4;
}

.c-see-all {
  display: inline-block;
  margin-left: 0.25rem;
}
</style>
