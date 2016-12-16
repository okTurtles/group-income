<template>
  <!--
  From what I can tell, .header seems to have been replaced
  by .nav. And .navbar is no longer being used.

  .hero works well with .nav, and adds:
  - gradient backgrounds
  - special support for videos, tabs, buttons, titles and subtitles
  - head, foot, and body sections (top, middle, bottom)

  Specifically, .hero adds the ability to have a .nav that's
  a different color from the main content of the page, but
  blends well using tabs to switch sections (just like on bulma.io),
  -->
  <section class="hero">
    <nav class="nav">
      <div class="container">
        <div class="nav-left">
          <a href="/simple/" class="nav-item is-tab">
            <!-- TODO: fix image shrinking when window is too small -->
            <!-- TODO: resize this image itself to make it smaller -->
            <!-- see: http://bulma.io/documentation/elements/image/ -->
            <img src="images/groupincome-logo-black.png">
          </a>
        </div>
        <div class="nav-center">
          <!-- TODO: use v-for to dynamically generate these? -->
          <!--TODO figure out what needs to be done with active classe after upgrade  "{activeClass: 'is-active', path: '/new-group'}"-->
          <router-link class="nav-item" active-class ="is-active" to="new-group"><i18n>Start a group</i18n></router-link>
          <router-link class="nav-item" active-class ="is-active" to="signup"><i18n>New User</i18n></router-link>
          <router-link class="nav-item" active-class ="is-active" to="user"><i18n>Profile</i18n></router-link>
          <router-link class="nav-item" active-class ="is-active" to="user-group"><i18n>Group</i18n></router-link>
          <router-link class="nav-item" active-class ="is-active" to="pay-group"><i18n>Pay Group</i18n></router-link>
          <router-link class="nav-item" active-class ="is-active" to="ejs-page" id="testEJS"><i18n>EJS test</i18n></router-link>
        </div>
        <!-- to put buttons in a nav, don't put the .nav-item
        on the button itself, but on a span.nav-item that encloses
        them. see: http://bulma.io/documentation/components/nav/ -->
        <div class="nav-right">
          <span class="nav-item is-tab control">
            <router-link class="button is-success" to="/new-user"><i18n>Sign Up</i18n></router-link>
            <a href="#" class="button"
               v-bind:class="loggedIn ? 'is-danger' : 'is-primary'"
              @click.prevent="toggleModal"
            >
              {{ loggedIn ? 'Sign Out' : 'Log In' }}
            </a>
          </span>
        </div>
      </div>
    </nav>
    <div class="modal" ref="modal">
      <div class="modal-background"></div>
      <div class="modal-content" style="width: 300px">
        <div class="card is-rounded">
          <div class="card-content">
            <h1 class="title">
              <i18n>Log In</i18n>
            </h1>
            <p class="control has-icon">
              <input class="input" type="email" placeholder="Email">
              <i class="fa fa-envelope"></i>
            </p>
            <p class="control has-icon">
              <input class="input" type="password" placeholder="Password">
              <i class="fa fa-lock"></i>
            </p>
            <p class="control">
              <label class="checkbox">
                <input type="checkbox">
                <i18n>Remember me</i18n>
              </label>
            </p>
            <p class="control">
              <button class="button is-primary is-medium is-fullwidth"
                @click="loginOrLogout"
              >
                <i class="fa fa-user"></i>
                <i18n>Login</i18n>
              </button>
            </p>
          </div>
        </div>
      </div>
      <div class="modal-close" @click="toggleModal"></div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'NavBar',
  methods: {
    loginOrLogout () {
      if (!this.loggedIn) this.toggleModal()
    },
    toggleModal () {
      // https://github.com/oneuijs/You-Dont-Need-jQuery#css--style
      this.$refs.modal.classList.toggle('is-active')
    }
  },
  data () {
    return {
      loggedIn: false
    }
  }
}
// TODO: the stuff below
/*
https://github.com/oneuijs/You-Dont-Need-jQuery#css--style
  $('.modal-button').click(function() {
    var target = $(this).data('target');
    $('html').addClass('is-clipped');
    $(target).addClass('is-active');
  });

  $('.modal-background, .modal-close').click(function() {
    $('html').removeClass('is-clipped');
    $(this).parent().removeClass('is-active');
  });

  $('.modal-card-head .delete, .modal-card-foot .button').click(function() {
    $('html').removeClass('is-clipped');
    $('#modal-ter').removeClass('is-active');
  });
*/
</script>
