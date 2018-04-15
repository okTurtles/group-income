<template>
  <div>
    <h1 class="subtitle is-2 has-text-centered" data-test="privacyStep">
      <i18n>Privacy Settings</i18n>
    </h1>
    <p><i18n>This step is to be designed. What group privacy settings would you feel more comfortable having control over? Let us know at dunno@groupincome.org!</i18n></p>
  </div>
</template>
<script>
export default {
  name: 'CreateGroupPrivacy',
  props: {
    group: {type: Object}
  }
}
</script>
