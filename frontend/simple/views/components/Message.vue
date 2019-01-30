<template>
  <div class="message" :class="'is-'+severity">
    <div class="media">
      <i class="fas" :class="getIcon"></i>
    </div>
    <div class="media-content">
      <div class="message-header">
        <slot name="header"></slot>
      </div>
      <div class="message-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  name: 'Message',
  props: {
    severity: String,
    default: 'info'
  },
  validator: function (value) {
    // The value must match one of these strings
    return ['info', 'warning', 'danger'].indexOf(value) !== -1
  },
  computed: {
    getIcon () {
      return {
        warning: 'fa-exclamation-triangle',
        danger: 'fa-times-circle',
        info: 'fa-info-circle'
      }[this.severity]
    }
  }
}
</script>
