<template>
  <!-- main containers:
   .container  http://bulma.io/documentation/layout/container/
   .content    http://bulma.io/documentation/elements/content/
   .section    http://bulma.io/documentation/layout/section/
   .block      base/classes.sass (just adds 20px margin-bottom except for last)
   -->
  <section class="section">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >

        <div class="columns is-multiline">
          <div class="column is-half">
            <p class="title is-4"><i18n>Needs Payment</i18n></p>
            <div class="box">
              <!-- list members needs to be paid -->
            </div>
            <p class="title is-4"><i18n>Paid</i18n></p>
            <div class="box">
              <!-- list members paid -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script>
export default {
  name: 'PayGroupMembers',
  props: {
  },
  data () {
    return {
    }
  }
}
</script>
