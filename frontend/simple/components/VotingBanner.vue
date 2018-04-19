<template>
  <div class="notification columns is-multiline is-centered is-warning has-text-centered">
    <p class="column is-12">
      <strong>{{who}}</strong> has proposed {{propose}} the <strong>{{what}}</strong> to <strong>{{change}}</strong>.
    </p>

    <div class="column is-3">
      <button class="button is-success is-fullwidth">
        For
      </button>
    </div>

    <div class="column is-3">
      <button class="button is-danger is-fullwidth">
        Against
      </button>
    </div>

    <p class="column is-12 is-size-7 is-italic is-opacity-1">
      {{votesCount}} votes received
    </p>
	</div>
</template>
<script>
  export default {
    name: 'VotingBanner',
    props: {
      who: String,
      what: String,
      change: String,
      votesCount: String,
      propose: String
    }
  }
</script>
