<template>
  <header>
    <div class="groupincome-logo">
      <img class="black" src="/images/groupincome-logo-black.png">
    </div>
    <nav>
      <ul>
        <li><a v-link="{ name: 'user-profile' }">New User / Edit User Profile</a></li>
        <li><a v-link="{ name: 'user-profile' }">User Profile</a></li>
        <li><a v-link="{ name: 'user-group' }">User Group</a></li>
        <li><a v-link="{ name: 'new-income' }">New Income</a></li>
        <li><a v-link="{ name: 'pay-group' }">Pay Group</a></li>
      </ul>
    </nav>
  </header>
</template>

<script>
  export default {
  }
</script>
