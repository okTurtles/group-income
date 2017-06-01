<template>
  <!-- TODO: use Bulma's .field for controls -->
  <section class="section">
    <h1>Log Postion: <span id="LogPosition">{{ $store.state.position }}</span></h1>
    <p class="control">
      Select an Event Type:
      <span class="select">
        <select ref="type" name="type" data-rules="required">
          <!-- must exactly match the types in shared/events.js -->
          <option value="Payment" selected>Payment</option>
          <option value="Vote">Vote</option>
        </select>
      </span>
    </p>
    <p class="control">
      <textarea class="textarea" name="payload" placeholder="payload" ref="payload"></textarea>
    </p>
    <p class="control">
      Current Group: {{ currentGroup }}
    </p>
    <!-- TODO: fix .level-item outside of .level -->
    <div class="level-item is-narrow">
      <a class="button is-success" id="submit" @click="submit">
        Submit
      </a>
      <!-- NOTE: we're no longer doing this random group stuff -->
      <a v-show="true" class="button submit" id="random" @click="createRandomGroup">
        Create Random Group
      </a>
      <div v-show="true">
        Count: <span id="count">{{ events.length }}</span>
      </div>
    </div>

    <div id="Log">
      <div class="box event" v-for="event in events">
        <article class="media">
          <div class="media-left">
            <figure class="image is-64x64">
              <span class="icon"><i class="fa fa-heart"></i></span>
            </figure>
          </div>
          <div class="media-content">
            <div class="content">
              <p>
                <strong>{{ event.toObject().type }}</strong> <small>@groupincomegroup</small> <small>31m</small>
                <br>
                {{ event.data }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
<style scoped>
  .submit{
    margin: 10px 0;
  }
</style>

<script>
  import * as Events from '../../../shared/events'
  import * as contracts from '../js/events'
  import * as db from '../js/database'
  import backend from '../js/backend'
  import {mapGetters} from 'vuex'
  import Vue from 'vue'

  export default {
    data () {
      return {events: []}
    },
    async created () {
      this.refresh()
      Vue.events.$on('eventHandled', (contractId, entry) => {
        this.events.push(entry)
      })
      Vue.events.$on('replacedState', this.refresh)
    },
    computed: {
      ...mapGetters(['currentGroup'])
    },
    methods: {
      refresh: async function () {
        const {currentGroupId, position} = this.$store.state
        // const position = await db.recentHash(currentGroupId)
        this.events = await db.collect(currentGroupId, position)
      },
      // NOTE: as we have greal group creation going now, we're no longer using this
      createRandomGroup: async function () {
        let randInt = (min, max) => Math.floor(Math.random() * (max - min)) + min
        // TODO: move this stuff somewhere else that makes sense.
        // subscribe first and so that handleEvent is automatically dispatched
        let entry = new contracts.GroupContract({
          authorizations: [Events.CanModifyAuths.dummyAuth()],
          groupName: `Group ${randInt(1, 100)}`,
          sharedValues: 'Testing this software',
          changePercentage: randInt(1, 100),
          openMembership: false,
          memberApprovalPercentage: randInt(1, 100),
          memberRemovalPercentage: randInt(1, 100),
          contributionPrivacy: 'Very Private',
          founderUsername: 'alsdfjlskdfjaslkfjsldkfj'
        })
        let hash = entry.toHash()
        // always subscribe *BEFORE* publishing the entry!
        await backend.subscribe(hash) // NOTE: in the real app we should handle any errors here
        // will be called once we receive event back and save it to store
        Vue.events.$once(hash, (contractId, entry) => {
          console.log('Entry received back and stored! Setting our new group:', entry)
          this.$store.commit('setCurrentGroupId', hash)
          this.$store.commit('setPosition', hash)
        })
        // Finally, publish the entry to the server (do this last)
        let res = await backend.publishLogEntry(hash, entry, hash)
        if (!res.ok) {
          console.error('failed to create group:', res.text)
        } else {
          console.log('group created. server response:', res.body)
        }
      },
      submit: async function () {
        let groupId = this.$store.state.currentGroupId
        let type = this.$refs.type.value
        var entry = new Events[type](
          { [type.toLowerCase()]: this.$refs.payload.value },
          await db.recentHash(groupId)
        )
        // const hash = entry.toHash()
        // Vue.events.$once(hash, (contractId, entry) => {
        //   console.log('action received back!')
        // })
        let res = await backend.publishLogEntry(groupId, entry)
        console.log('entry sent, server response:', res)
      }
    }
  }
</script>
