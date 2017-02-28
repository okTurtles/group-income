<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
        <div class="column is-10" >
          <div class="columns is-gapless">
            <div class="column">
              <p class="control has-addons">
                <input class="input" type="text" v-model="searchUser" placeholder="Find a member">
                <a class="button is-info" v-on:click="add">
                  <i18n>Add</i18n>
                </a>
              </p>
              <span v-if="error" id="badUsername" class="help is-danger"><i18n>Invalid Username</i18n></span>
            </div>
            <div class="column">
              <table class="table is-bordered is-striped is-narrow">
                <thead>
                <tr>
                  <th><i18n>Group Members</i18n></th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(member, index) in members">
                  <td>
                    <div class="media">
                      <div class="media-left">
                        <p class="image is-64x64">
                          <img src="http://bulma.io/images/placeholders/128x128.png">
                        </p>
                      </div>
                      <div class="media-content">
                        <strong>{{member.name}}</strong>
                      </div>
                      <div class="media-right">
                        <button class="delete" v-on:click="remove(index)"></button>
                      </div>
                    </div>
                  </td>
                </tr>
                </tbody>
              </table>
              <div class="center button-box">
                <div class="center">
                  <div id="successMsg" v-if="invited" class="created"><i18n>Success</i18n></div>
                  <button class="button is-success is-large center" v-if="!invited" v-on:click="submit" type="submit"><i18n>Invite Members</i18n></button>
                  <a class="button is-warning is-large center" v-if="invited"><i18n>Next: ?</i18n></a>
                </div>
              </div>
            </div>
          </div>
        </div>
       <div class="column is-1"></div>
    </div>
  </section>
</template>
<script>
import fetch from 'node-fetch'
import request from 'superagent'
import * as Events from '../../../shared/events'
import _ from 'lodash'
import {HapiNamespace} from '../js/backend/hapi'
import nacl from 'tweetnacl'
import {sign} from '../../../shared/functions'
var namespace = new HapiNamespace()
var buf2b64 = buf => Buffer.from(buf).toString('base64')
var signature = sign(_.mapValues(nacl.sign.keyPair(), buf2b64))
var postEvent = function (event, contract) {
  return request.post(`${process.env.API_URL}/event/${contract || event.toHash()}`)
          .set('Authorization', `gi ${signature}`)
          .send({hash: event.toHash(), entry: event.toObject()})
}

export default {
  name: 'InviteView',
  data () {
    return {
      searchUser: null,
      members: [],
      error: false,
      invited: false
    }
  },
  methods: {
    add: async function () {
      if (this.searchUser) {
        try {
          let response = await namespace.lookup(this.searchUser)
          let contractId = response.body.data.value
          if (!this.members.find(member => member.name === this.searchUser)) {
            this.members.push({name: this.searchUser, contractId: contractId})
          }
          this.searchUser = null
          this.error = false
        } catch (ex) {
          this.error = true
        }
      }
    },
    remove: function (index) {
      this.members.splice(index, 1)
    },
    submit: async function () {
      for (let i = 0; i < this.members.length; i++) {
        let member = this.members[i]
        let fetched = await fetch(`${process.env.API_URL}/events/${member.contractId}/${member.contractId}`)
        let events = await fetched.json()
        let [contract, ...actions] = events.map(e => {
          return Events[e.entry.type].fromObject(e.entry, e.hash)
        })
        let state = contract.toVuexState()
        actions.forEach(action => {
          let type = action.constructor.name
          contract.constructor.vuex.mutations[type](state, action.data)
        })
        let res = await fetch(`${process.env.API_URL}/latestHash/${state.attributes.mailbox}`).then(r => r.json())
        let mailbox = res.data.hash
        let invite = new Events.PostInvite({groupId: this.$store.state.currentGroupId}, mailbox)
        await postEvent(invite, state.attributes.mailbox)
      }
      this.invited = true
    }
  }
}
</script>
