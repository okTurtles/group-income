<template>
  <section>
    <h3 class="title is-3"><i18n>Members</i18n></h3>
    <ul>
      <li v-for="(member, username) in members">
        {{ username }}
      </li>
    </ul>
    <a class="button invite-button" @click.prevent="invite(group.id)">
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
    background-color: #ECECEC;
    color: #6CAD22;
    height: 63px;
    width: 63px;
  }
  .invite-button .icon i {
    font-size: 36px;
  }
</style>
<script>
  export default {
    name: 'GroupMembers',
    props: {
      group: Object
    },
    methods: {
      invite (groupId) {
        this.$store.commit('setCurrentGroupId', groupId)
        this.$router.push({path: '/invite'})
      }
    },
    computed: {
      members () {
        var members = this.$store.getters.membersForGroup()
        const usernames = Object.keys(members)
        usernames.map(function (username, idx) {
          members[username] = {
            attrs: members[username]
          }
        })
        return members
      }
    }
  }
</script>
