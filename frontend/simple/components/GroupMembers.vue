<template>
  <section class="gm-container">
    <div class="level">
      <h3 class="title"><i18n>Group Members</i18n></h3>
    </div>
    <div class="level">
      <div class="level-left">
        <ul class="columns is-mobile is-narrow is-multiline is-marginless">
          <li v-for="(member, i) in profilesForGroupMock"
            class="column is-narrow badge">
            <h4 class="badge-name is-ellipsis is-size-7">
              {{ member.username }}
            </h4>

            <img class="badge-img" :src="member.photo" alt="" />

            <!-- TODO: How to handle color / multiple tags logic? -->
            <span class="tag badge-tag is-ellipsis">
              {{ member.pledge }}
            </span>
          </li>
        </ul>
        <div class="badge">
          <a class="button action is-light" @click.prevent="invite">
            <span class="icon"><i class="fa fa-plus has-text-success"></i></span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
<style lang="scss" scoped>
  // @import "bulma/sass/utilities/mixins";

  $iconSize: 4.6rem;
  $marginVertical: 0.3rem;

  .gm-container {
    margin: 4rem 0; // find better way to handle margins between dashboard elements
  }

  .title {
    margin-top: 30px;
  }

  .badge {
    width: 6.25rem;
    margin-right: 2rem;
    margin-bottom: 2rem;
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

    // @include tablet {
    @media (min-width: 769px) {
      margin-top: -0.75rem; // force h. alignment with .badge-img
    }
  }
</style>
<script>
  import {mapGetters} from 'vuex'
  export default {
    name: 'GroupMembers',
    data () {
      return {
        profilesForGroupMock: [{
          username: 'You',
          photo: '/simple/images/default-avatar.png',
          pledge: '€200'
        }, {
          username: 'Sam',
          photo: '/simple/images/default-avatar.png',
          pledge: '€150'
        }, {
          username: 'Zoe',
          photo: '/simple/images/default-avatar.png',
          pledge: 'Cuteness'
        }]
      }
    },
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
