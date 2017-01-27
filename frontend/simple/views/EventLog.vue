<template>
    <form novalidate ref="form"
          name="formData" class="container eventlog"
          @submit.prevent="submit"
    >
        <section class="section">
            <p class="control">
              <h1>Log Postion: <span id="LogPosition">{{logPosition}}</span></h1>
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
              <span class="select">
                <select ref="type" name="type" data-rules="required">
                  <option value="" disabled selected>Select an Event Type</option>
                  <option value="Payment">Payment</option>
                  <option value="Voting">Voting</option>
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
                Count: <span id="count">{{events.length}}</span>
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
                      <strong>{{ event.data.type }}</strong> <small>@groupincomegroup</small> <small>31m</small>
                      <br>
                      {{ event.data.payload }}
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
  import EventLog from '../js/event-log.js'
  import request from 'superagent'
  import {toHash, makeGroup, makeEntry} from '../../../shared/functions'
  export default{
    data () {
     return {events:[]}
    },
    created(){
      this.$store.dispatch('createUser')
    },
    computed: {
      logPosition () {
        // TODO: a comment was added to the review to PR 155 to properly deal with this
        //       but was never incorporated. Same for fetchData below.
        // See: https://github.com/okTurtles/group-income-simple/pull/155#discussion_r97190874
        if(this.$store.state.session && this.$store.state.settings.currentGroup) {
          this.fetchData()
          return this.$store.state.settings.currentGroup.currentLogPosition
        } else {
          return null
        }
      }
    },
    methods: {
      // TODO: https://github.com/okTurtles/group-income-simple/pull/155#discussion_r97190874
      fetchData: async function () {
        var groupId = this.$store.state.settings.currentGroup.groupId
        var from = this.$store.state.settings.currentGroup.currentLogPosition
        this.events = await EventLog.collect(groupId, from)
      },
      createRandomGroup: function () {
        let getRandomInt = (min, max) => {
          return Math.floor(Math.random() * (max - min)) + min
        }
        let group =  makeGroup(
          `Group ${getRandomInt(1, 100)}` ,
          'Testing this software',
          getRandomInt(1, 100),
          false,
          getRandomInt(1, 100),
          getRandomInt(1, 100),
          getRandomInt(1, 2000),
          'Very Private',
          this.$store.state.loggedInUser
        )
        let entry = makeEntry(CREATION, group, null)
        let hash = toHash(entry)
        request.post(`${process.env.API_URL}/group`).send({ hash, entry })
        // this.$store.dispatch('createGroup', group)
      },
      submit: function () {
        var type = this.$refs.type
        var entry = makeEntry(
          type.options[type.selectedIndex].value,
          this.$refs.payload.value,
          this.$store.state.settings.currentGroup.currentLogPosition
        )
        let hash = toHash(entry)
        request.post(`${process.env.API_URL}/event/${groupId}`).send({hash, entry})
        // this.$store.dispatch('appendLog', entry)
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
