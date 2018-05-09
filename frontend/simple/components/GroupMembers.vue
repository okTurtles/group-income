<template>
  <section data-test="groupMembers">
    <div class="level">
      <h3 class="title"><i18n>Group Members</i18n></h3>
    </div>
    <div class="level">
      <div class="level-left">
        <ul class="columns is-mobile is-narrow is-multiline is-marginless">
          <li v-for="(member, i) in profiles"
            class="column is-narrow badge"
            data-test="member"
          >
            <h4
              class="badge-name is-size-7 gi-is-ellipsis"
              data-test="username"
            >
              {{ member.username }}
            </h4>

            <user-image class="badge-img" :username="member.username" />

            <!-- TODO: How to handle color / multiple tags logic? -->
            <span class="tag badge-tag gi-is-ellipsis" v-if="member.pledge">
              {{ member.pledge }}
            </span>
          </li>
        </ul>
        <div class="badge">
          <a class="button action is-light"
            data-test="inviteButton"
            @click.prevent="invite"
          >
            <span class="icon"><i class="fa fa-plus has-text-success"></i></span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
  @import "../sass/theme/index";

  $iconSize: 4.6rem;
  $marginVertical: 0.3rem;

  .title {
    margin-top: 30px;
  }

  .badge {
    width: 6.25rem;
    margin-right: 2rem;
    margin-bottom: 1rem;
    padding: 0;
    text-align: center;

    &-name {
      margin-bottom: $marginVertical;
    }

    &-img {
      display: inline-block;
      width: $iconSize;
      height: $iconSize;
      border-radius: 50%;
      margin-bottom: $marginVertical;
    }

    &-tag {
      margin-top: $marginVertical;
      width: 100%;
    }
  }

  .button.action {
    height: $iconSize;
    width: $iconSize;
    border-radius: 50%;

    .fa.fa-plus {
      font-size: 2.5rem;
      height: 2.25rem;
    }

    @include tablet {
      margin-top: $size-7 + $marginVertical; // force h. alignment with .badge-img
    }
  }
</style>
<script>
  import UserImage from './user-image.vue'

  export default {
    name: 'GroupMembers',
    components: {
      UserImage
    },
    methods: {
      invite () {
        this.$router.push({path: '/invite'})
      }
    },
    computed: {
      profiles () {
        return this.$store.getters.profilesListForGroup()
      }
    }
  }
</script>
