<template lang="pug">
.c-permissions-wrapper(:class='{ "is-mobile": isMobile }')
  span.c-display-text.has-text-1 {{ displayText }}

  .c-see-all-wrapper(
    v-on-clickaway='closeTooltip'
  )
    i18n.link.c-see-all(
      v-if='permissionsNo > 1'
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

          modal-close.c-permissions-close-btn(
            @close='closeTooltip'
            data-test='closeViewPermission'
          )

        ul.c-permissions-list
          li.c-permission-item(
            v-for='permissionId in permissions'
            :key='permissionId'
          )
            span.c-permission-name {{ `- ${getPermissionDisplayName(permissionId)}` }}
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
    },
    isMobile: {
      type: Boolean,
      default: false
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
        ? `- '${getPermissionDisplayName(p[0])}'`
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

  &.is-mobile {
    padding: 0;
  }
}

.c-display-text {
  font-size: $size_4;
}

.c-see-all-wrapper {
  position: relative;
  display: inline-flex;
  margin-left: 0.25rem;
  width: max-content;
}

.c-see-all {
  display: inline-block;
}

.c-permissions-tooltip {
  position: absolute;
  display: block;
  bottom: -0.5rem;
  transform: translateY(100%);
  right: 0;
  width: max-content;
  min-width: 10.75rem;
  max-width: 14rem;
  padding: 1rem;
  z-index: $zindex-tooltip;
  background-color: $background_0;
  border-radius: 10px;
  opacity: 0;
  height: 0;
  pointer-events: none;
  box-shadow: 0 0.5rem 1.25rem rgba(54, 54, 54, 0.3);

  .is-dark-theme & {
    box-shadow: 0 0.5rem 1.25rem rgba(38, 38, 38, 0.895);
  }

  &.is-active {
    opacity: 1;
    height: max-content;
    transition: opacity 200ms ease-out;
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
  }

  .c-permission-item:not(:last-child) {
    margin-bottom: 0.4rem;
  }

  .c-permission-name {
    background-color: $general_1_opacity_6;
    padding: 0.2rem 0.4rem 0.3rem;
    border-radius: 4px;
    line-height: 1.175;
    display: inline-block;
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
