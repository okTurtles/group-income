<template>
  <li :is="tag" v-on="$listeners"
    class="box is-compact c-contribution"
    :class="[{ 'has-controls': !!editAriaLabel }, `is-${variant}`]"
  >
    <p class="box-body">
      <slot></slot>
    </p>
    <div class="box-controls" v-if="!!editAriaLabel">
      <button
        class="button is-icon"
        :aria-label="editAriaLabel"
        @click="$emit('edit-click')"
      >
        <!-- TODO REVIEW UX - should it be the same icon-edit
        to edit a input and to open a modal? -->
        <i class="fa fa-edit"></i>
      </button>
    </div>
  </li>
</template>
<style lang="scss" scoped>
@import "../../../assets/sass/theme/index";

.c-contribution {
  width: 100%;
  font-size: inherit;
  min-height: 45px; // TODO REVIEW hardcoded value

  &.is-readonly {
    border: none;
    background-color: $white-ter;
  }

  &.is-editable {
    border: none;
    background-color: $primary-bg-a;
  }

  &.is-unfilled {
    cursor: pointer;
    text-align: left;

    &:hover,
    &:focus {
      background-color: $primary-bg-a;
    }
  }

  &-icon {
    color: $primary;
    margin-right: $gi-spacer-sm;
  }
}
</style>
<script>
export default {
  name: 'Contribution',
  props: {
    tag: {
      type: String,
      default: 'li'
    },
    // TODO create validator here
    variant: String,
    editAriaLabel: String
  }
}
</script>
