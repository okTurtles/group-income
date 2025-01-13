<template lang="pug">
.c-permissions-wrapper(
  v-on-clickaway='closeTooltip'
)
  span.c-display-text.has-text-1 {{ displayText }}
  i18n.link.c-see-all(
    tag='button'
    @click='openTooltip'
  ) See all

  .c-permissions-tooltip(
    :class='{ "is-active": ephemeral.isTooltipActive }'
  )
    .c-permissions-tooltip-overlay(@click.stop='closeTooltip')

    .c-permissions-tooltip-content
      header.c-permissions-tooltip-header
        i18n.c-tooltip-title(
          tag='h2'
          :args='{ no: permissionsNo }'
        ) {no} permissions

        modal-close.c-permissions-close-btn(@close='closeTooltip')

      ul.c-permissions-list
        li.c-permission-item(
          v-for='permissionId in permissions'
          :key='permissionId'
        ) {{ `- ${getPermissionDisplayName(permissionId)}` }}
</template>

<script>
import { L } from '@common/common.js'
import { getPermissionDisplayName } from './permissions-utils.js'
import { mixin as clickaway } from 'vue-clickaway'
import ModalClose from '@components/modal/ModalClose.vue'

export default {
  name: 'ViewPermissions',
  components: {
    ModalClose
  },
  mixins: [clickaway],
  data () {
    return {
      ephemeral: {
        isTooltipActive: false
      }
    }
  },
  props: {
    permissions: {
      type: Array
    }
  },
  computed: {
    permissionsNo () {
      return this.permissions?.length || 0
    },
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
    getPermissionDisplayName,
    openTooltip () {
      this.ephemeral.isTooltipActive = true
    },
    closeTooltip () {
      this.ephemeral.isTooltipActive = false
    }
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

.c-permissions-tooltip {
  position: absolute;
  bottom: -0.25rem;
  transform: translateY(100%);
  left: 0;
  width: 100%;
  max-width: 17.5rem;
  padding: 1rem 0.75rem;
  height: max-content;
  z-index: $zindex-tooltip;
  background-color: $background_0;
  border-radius: 10px;
  display: none;
  pointer-events: none;

  &.is-active {
    display: block;
    pointer-events: initial;
  }

  &-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 0.5rem;
  }

  .c-tooltip-title {
    font-size: 0.925rem;
    font-weight: 700;
  }

  &-content {
    border-radius: 10px;
  }

  .c-permissions-list {
    margin-top: 0.5rem;
    font-size: $size_4;
    color: $text_1;
  }

  .c-permission-item:not(:last-child) {
    margin-bottom: 0.2rem;
  }

  @include from($tablet) {
    box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);

    .is-dark-theme & {
      box-shadow: 0 0.5rem 1.25rem rgba(38, 38, 38, 0.895);
    }
  }
}

button.c-permissions-close-btn {
  position: relative;
  top: unset;
  right: unset;
  left: unset;
  width: 1.5rem;
  height: 1.5rem;
  min-height: unset;
  flex-shrink: 0;

  &::before,
  &::after {
    width: 0.625rem;
  }
}
</style>
