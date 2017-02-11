<template>
    <form novalidate ref="form"
          name="formData" class="container eventlog"
          @submit.prevent="submit"
    >
        <section class="section">
            <p class="control">
              <h1>Log Postion: <span id="LogPosition">{{ position }}</span></h1>
            <div>
              <a class="button backward is-primary" v-on:click="backward">
                <span class="icon">
                  <i class="fa fa-step-backward"></i>
                </span>
              </a>
              <a class="button forward is-primary" v-on:click="forward">
                    <span class="icon">
                      <i class="fa fa-step-forward"></i>
                    </span>
              </a>
            </div>
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
            <div class="level-item is-narrow">
                <button class="button submit is-success" id="submit" type="submit">
                    Submit
                </button>
                <a class="button submit" id="random" v-on:click="createRandomGroup">
                  Create Random Group
                </a>
                Count: <span id="count">{{ events.length }}</span>
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
                      {{ event.toObject().data }}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
    </form>
</template>
<style scoped>
  .submit{
    margin: 10px 0;
  }
</style>

<script>
  import * as Events from '../../../shared/events'
  import * as db from '../js/database'
  import backend from '../js/backend'

  export default {
    data () {
      return {events: []}
    },
    created () {
      // NOTE: this works, but backend doesn't persist database, so during
      //       development this makes things break.
      // this.$store.dispatch('loadSettings').then(() => {
      //   this.$store.state.groups.forEach(backend.subscribe)
      // })
    },
    computed: {
      position () {
        this.refresh() // update this.events anytime the position changes
        return this.$store.state.currentGroup.position
      }
    },
    methods: {
      refresh: async function () {
        var {groupId, position} = this.$store.state.currentGroup
        this.events = await db.collect(groupId, position)
      },
      createRandomGroup: async function () {
        let randInt = (min, max) => Math.floor(Math.random() * (max - min)) + min
        // TODO: move this stuff somewhere else that makes sense.
        // subscribe first and so that handleEvent is automatically dispatched
        let entry = new Events.GroupContract({
          groupName: `Group ${randInt(1, 100)}`,
          sharedValues: 'Testing this software',
          changePercentage: randInt(1, 100),
          openMembership: false,
          memberApprovalPercentage: randInt(1, 100),
          memberRemovalPercentage: randInt(1, 100),
          contributionPrivacy: 'Very Private',
          founderHashKey: 'alsdfjlskdfjaslkfjsldkfj'
        })
        let hash = entry.toHash()
        await backend.subscribe(hash)
        let res = await backend.publishLogEntry(hash, entry, hash)
        if (!res.ok) {
          console.error('failed to create group:', res.text)
        } else {
          console.log('group created. server response:', res.body)
        }
      },
      submit: async function () {
        let groupId = this.$store.state.currentGroup.groupId
        let type = this.$refs.type.value
        var entry = new Events[type](
          { [type.toLowerCase()]: this.$refs.payload.value },
          await db.recentHash(groupId)
        )
        let res = await backend.publishLogEntry(groupId, entry)
        console.log('entry sent, server response:', res)
      },
      forward: function () {
        this.$store.dispatch('forward')
      },
      backward: function () {
        this.$store.dispatch('backward')
      }
    }
  }
</script>
