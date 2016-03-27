<!--
    Vue file spec: https://vuejs.github.io/vue-loader/start/spec.html
    example App.vue: https://github.com/vuejs/vue-router/blob/dev/example/advanced/app.vue
-->
<template>
  <div>
    <header>
      <div class="groupincome-logo">
        <img class="black" src="/images/groupincome-logo-black.png">
      </div>
      <nav>
        <ul>
          <li><a v-link="{ path: '/new-user' }">New User</a></li>
          <li><a v-link="{ path: '/user' }">User Profile</a></li>
          <li><a v-link="{ path: '/user-group' }">User Group</a></li>
          <li><a v-link="{ path: '/new-income' }">New Income</a></li>
          <li><a v-link="{ path: '/pay-group' }">Pay Group</a></li>
        </ul>
      </nav>
    </header>
    <div class="container">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
        // params
    }
  }
}
</script>
