<template>
  <section>
    <h3 class="title is-3"><i18n>Members</i18n></h3>
    <ul>
      <li v-for="(member, username) in profilesForGroup()">
        {{ username }}
      </li>
    </ul>
    <a class="button invite-button" @click.prevent="invite">
      <span class="icon"><i class='fa fa-plus'></i></span>
    </a>
  </section>
</template>
<style lang="scss" scoped>
  h3.title {
    margin-top: 30px;
  }

  .invite-button {
    border-radius: 999px;
    background-color: #ececec;
    color: #6cad22;
    height: 63px;
    width: 63px;
  }

  .invite-button .icon i {
    font-size: 36px;
  }
</style>
<script>
  import {mapGetters} from 'vuex'
  export default {
    name: 'GroupMembers',
    methods: {
      invite () {
        this.$router.push({path: '/invite'})
      }
    },
    computed: {
      ...mapGetters(['profilesForGroup'])
    }
  }
</script>
