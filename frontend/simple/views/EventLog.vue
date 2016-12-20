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
            </div>
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
                      {{ event.payload }}
                    </p>
                  </div>
                </div>
              </article>
            </div>
        </section>
    </form>
</template>
<style>
  .submit{
    margin: 10px 0;
  }
</style>

<script>
    import EventLog from '../js/event-log'
    import pull from 'pull-stream'
    var db
    export default{
      data () {
       return {events:[]}
      },
      computed: {
        logPosition () {
          return this.$store.state.logPosition
        }
      },
      created () {
        (async function (){
          db = await EventLog()
          this.$store.subscribe((mutation, state) => {
            if(mutation.type === 'UPDATELOG'){
              this.fetchData()
            }
          })
          this.fetchData()
        }.bind(this))()
      },
      methods: {
        fetchData: function(){
          pull(db.stream({lt: this.logPosition }), pull.collect((err, events) =>{
            if(err){
              throw err
            }
            this.events = events
          }))
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
