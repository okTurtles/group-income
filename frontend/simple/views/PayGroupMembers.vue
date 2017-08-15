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
              <ul>
                <li v-for="(member, username) in membersToPay">
                  {{ username }}

                </li>
              </ul>
            </div>
            <p class="title is-4"><i18n>Paid</i18n></p>
            <div class="box">
              <ul>
                <li v-for="(member, username) in paidMembers">
                  {{ username }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script>
import {mapGetters} from 'vuex'
const incomeDistribution = require('../js/distribution/mincome-proportional').default
export default {
  name: 'PayGroupMembers',
  props: {},
  data () {
    return {}
  },
  computed: {
    ...mapGetters(['profilesForGroup']),
    membersToPay () {
      var members = this.profilesForGroup()
      var membersDistribution = []
      const usernames = Object.keys(members)
      usernames.map(function (username) {
        membersDistribution.push({
          name: username,
          amount: 200 // this should be the contribution which needs to be saved at 'set contribution' page
        })
        members[username] = {
          attrs: members[username]
        }
      })
      console.log('Members Distribution: ', membersDistribution)
      var incomes = incomeDistribution(membersDistribution, 500) // should be equal with group income baseline
      console.log('Distributed Incomes: ', incomes)
      return members
    },
    paidMembers () {
      var members = []
      return members
    }
  }
}
</script>
