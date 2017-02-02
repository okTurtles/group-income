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
              Select an Event Type:
              <span class="select">
                <select ref="type" name="type" data-rules="required">
                  <!-- Values must match the types in shared/types.js -->
                  <option value="payment" selected>Payment</option>
                  <option value="voting">Voting</option>
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
                      <strong>{{ event.type }}</strong> <small>@groupincomegroup</small> <small>31m</small>
                      <br>
                      {{ event.data }}
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
  import * as db from '../js/database'
  import backend from '../js/backend'
  import {makeGroup, makeEntry, toHash} from '../../../shared/functions'
  import {RESPONSE_TYPE, ENTRY_TYPE} from '../../../shared/constants'

  export default {
    data () {
      return {events: []}
    },
    created () {
      // NOTE: this works, but backend doesn't persist database, so during
      //       development this makes things break.
      // console.log('dispatching loadSettings!')
      // this.$store.dispatch('loadSettings')
    },
    computed: {
      logPosition () {
        // TODO: this. point is to update this.events anytime logPosition changes
        this.recollectEvents()
        return this.$store.state.currentGroup.position
      }
    },
    methods: {
      recollectEvents: async function () {
        var {groupId, position} = this.$store.state.currentGroup
        this.events = await db.collect(groupId, position)
      },
      createRandomGroup: async function () {
        let getRandomInt = (min, max) => {
          return Math.floor(Math.random() * (max - min)) + min
        }
        let group = makeGroup(
          `Group ${getRandomInt(1, 100)}`,
          'Testing this software',
          getRandomInt(1, 100),
          false,
          getRandomInt(1, 100),
          getRandomInt(1, 100),
          'Very Private',
          'alsdfjlskdfjaslkfjsldkfj'
        )
        // TODO: move this stuff somewhere else that makes sense.
        // subscribe first and so that handleEvent is automatically dispatched
        let entry = makeEntry(ENTRY_TYPE.CREATION, group, null)
        let hash = toHash(entry)
        await backend.subscribe(hash)
        let res = await backend.publishLogEntry(hash, entry, hash)
        if (!res || res.type === RESPONSE_TYPE.ERROR) {
          console.error('failed to create group!')
        } else {
          console.log('group created. server response:', res)
        }
      },
      submit: async function () {
        // TODO: test invalid hash for entry
        // TODO: test adding to the wrong groupId
        // TODO: test adding to the wrong parentHash
        let groupId = this.$store.state.currentGroup.groupId
        let type = this.$refs.type.value
        var key
        switch (type) {
          case ENTRY_TYPE.PAYMENT: key = 'amount'; break
          case ENTRY_TYPE.VOTING: key = 'vote'; break
          default: throw Error('unsupported Entry type: ' + type)
        }
        let res = await backend.publishLogEntry(groupId, makeEntry(
          type,
          {[key]: this.$refs.payload.value},
          await db.recentHash(groupId)
        ))
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
