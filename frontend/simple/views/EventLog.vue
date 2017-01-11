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
                <span id="count">Count: {{events.length}}</span>
            </div>
          <div id="Log">
            <div class="box event" v-for="event in eventList">
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
                      {{ event.payload }}
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
  import {collect} from '../js/event-log.js'
    export default{
      data () {
       return {events:[]}
      },
      computed: {
        logPosition () {
          if(this.$store.state.currentGroupLog){
            this.fetchData()
            return this.$store.state.currentGroupLog.current
          } else {
            return null
          }
        },
        eventList () {
          return this.events.map(event => event)
        }
      },
      methods: {
        fetchData: async function () {
            this.events = await collect(this.$store.state.currentGroupLog)
        },
        createRandomGroup: function () {
          let getRandomInt = (min, max)=> {
            return Math.floor(Math.random() * (max - min)) + min;
          }
          let group = {
            groupName: `Group ${getRandomInt(1, 100)}` ,
            sharedValues: 'Testing this software',
            changePercentage: getRandomInt(1, 100) ,
            openMembership: false,
            memberApprovalPercentage: getRandomInt(1, 100),
            memberRemovalPercentage: getRandomInt(1, 100),
            incomeProvided: getRandomInt(1, 2000),
            conrtibutionPrivacy: "Very Private",
            founder: this.$store.state.loggedInUser
          }
          this.$store.dispatch('createGroup', group)
        },
        submit: function () {
          this.$store.dispatch('appendLog', {type: this.$refs.type.options[this.$refs.type.selectedIndex].value, payload: this.$refs.payload.value})
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
