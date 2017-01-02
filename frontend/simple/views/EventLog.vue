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
                  <option value="Creation">Creation</option>
                </select>
              </span>
            </p>
            <p class="control">
                <textarea class="textarea" name="payload" placeholder="payload" ref="payload"></textarea>
            </p>
            <div class="level-item is-narrow">
                <button class="button submit is-success" data-rules="required" type="submit">
                    Submit
                </button>
                <span id="count">Count: {{events.length}}</span>
            </div>
          <div id="Log">
            <div class="box event" v-for="event in eventList" :key="event.seq">
              <article class="media">
                <div class="media-left">
                  <figure class="image is-64x64">
                    <span class="icon"><i class="fa fa-heart"></i></span>
                  </figure>
                </div>
                <div class="media-content">
                  <div class="content">
                    <p>
                      <strong>{{ event.value.type }}</strong> <small>@groupincomegroup</small> <small>31m</small>
                      <br>
                      {{ event.value.payload }}
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
    import EventLog from '../js/event-log'
    import Pull from 'pull-stream'
    var db
    export default{
      data () {
       return {events:[]}
      },
      computed: {
        logPosition () {
          return this.$store.state.logPosition
        },
        eventList () {
          return this.events.map(event => event)
        }
      },
      created: function () {
        db = EventLog()
        this.$store.watch((state) => { return state.offset.length }, () => {
          this.events = []
          this.fetchData()
        })
       // Pull(db.payment.stream(), Pull.drain(console.log))
        this.fetchData()
      },
      methods: {
        fetchData: function () {
          Pull(db.events.stream(), Pull.drain(this.appendEvents))
        },
        appendEvents: function (event) {
          this.events.push(event)
        },
        submit: function (){
          this.$store.dispatch('apppendLog', {type: this.$refs.type.options[this.$refs.type.selectedIndex].value, payload: this.$refs.payload.value})
        },
        forward: function (){
          this.$store.dispatch('forward')
        },
        backward: function (){
          this.$store.dispatch('backward')
        }
      }
    }
</script>
