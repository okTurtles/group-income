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
          <a class="nav-item" v-link="{activeClass: 'is-active', path: '/new-user'}">New User</a>
          <a class="nav-item" v-link="{activeClass: 'is-active', path: '/user'}">Profile</a>
          <a class="nav-item" v-link="{activeClass: 'is-active', path: '/user-group'}">Group</a>
          <a class="nav-item" v-link="{activeClass: 'is-active', path: '/new-income'}">New Income</a>
          <a class="nav-item" v-link="{activeClass: 'is-active', path: '/pay-group'}">Pay Group</a>
          <a class="nav-item" v-link="{activeClass: 'is-active', path: '/ejs-page'}" id="testEJS">EJS test</a>
        </div>
        <!-- to put buttons in a nav, don't put the .nav-item
        on the button itself, but on a span.nav-item that encloses
        them. see: http://bulma.io/documentation/components/nav/ -->
        <div class="nav-right">
          <span class="nav-item is-tab control">
            <a class="button is-success" v-link="'/new-user'">Sign Up</a>
            <a href="#"
              class="button is-{{ loggedIn ? 'danger' : 'primary'}}"
              @click.prevent="toggleModal"
            >
              {{ loggedIn ? 'Sign Out' : 'Log In' }}
            </a>
          </span>
        </div>
      </div>
    </nav>
    <!-- TODO: in vue 2.x v-el is deprecated and v-ref should be used instead -->
    <div class="modal" v-el:modal>
      <div class="modal-background"></div>
      <div class="modal-content" style="width: 300px">
        <div class="card is-rounded">
          <div class="card-content">
            <h1 class="title">
              Log In
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
                Remember me
              </label>
            </p>
            <p class="control">
              <button class="button is-primary is-medium is-fullwidth"
                @click="loginOrLogout"
              >
                <i class="fa fa-user"></i>
                Login
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
  var $ = require('jquery')
  export default {
    name: 'NavBar',
    methods: {
      loginOrLogout () {
        if (!this.loggedIn) this.toggleModal()
      },
      toggleModal() {
        $(this.$els.modal).toggleClass('is-active')
      }
    },
    data() {
      return {
        loggedIn: false
      }
    }
  }
  // TODO: the stuff below
/*
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