<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <div class="columns">
          <div class="column is-one-quarter">
            <div class="panel">
              <div class="panel-heading">
                Menu
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-pencil"></i>
                </span>
                <a v-on:click="compose">compose</a>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-envelope"></i>
                </span>
                <a v-on:click="inboxMode">messages</a>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-users"></i>
                </span>
                <a v-on:click="invitesMode">invites</a>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-trash"></i>
                </span>
                <a v-on:click="deletedMode">deleted</a>
              </div>
            </div>
          </div>
          <div class="column"></div>
          <div class="column is-two-thirds">
            <div id="compose" class="panel" v-show="mode === 'compose'">
              <div class="panel-heading">
                <div><strong>Type:</strong>&nbsp;{{currentMessage.constructor.name}}</div>
                <div><strong style="margin-top: auto">To:</strong>&nbsp;
                  <input class="input is-small" type="text" style="width: 90%;" v-model="recipient">
                  <a class="button is-small" v-on:click="addRecipient">
                    <span class="icon is-small">
                      <i class="fa fa-plus-circle"></i>
                    </span>
                  </a>
                </div>
                <span v-if="error" id="badUsername" class="help is-danger"><i18n>Invalid Username</i18n></span>
                <table>
                  <tr v-for="(recipient, index) in recipients">
                    <td>
                      {{recipient.name}}
                      <i class="fa fa-minus-circle icon is-small" v-on:click="removeRecipient(index)" ></i>
                    </td>
                  </tr>
                </table>
              </div>
              <div class="panel-block">
                <textarea class="textarea"></textarea>
              </div>
              <div class="panel-block" >
                <button class="button is-success" type="submit" v-on:click="send" :disabled="composedMessage.data.message"  style="margin-left:auto; margin-right: 0"><i18n>Send</i18n></button>
                <button class="button is-danger" type="submit" v-on:click="cancel" style="margin-left:10px; margin-right: 0"><i18n>Cancel</i18n></button>
              </div>
            </div>
            <div class="panel" v-show="mode === 'read'">
              <div class="panel-heading">
                <div><strong>Type:</strong>&nbsp;{{currentMessage.constructor.name}}</div>
                <div><strong>From:</strong>&nbsp;{{currentMessage.data.from}}</div>
              </div>
              <p class="panel-block">{{currentMessage.data.message}}</p>
              <div class="panel-block" >
                <button class="button is-danger" type="submit" style="margin-left:auto; margin-right: 0" v-on:click="remove(index)"><i18n>Delete</i18n></button>
                <button class="button is-primary" type="submit" v-on:click="inboxMode"  style="margin-left:10px; margin-right: 0"><i18n>Return to Inbox</i18n></button>
              </div>
            </div>
            <table class="table is-bordered is-striped is-narrow" v-show="mode === 'inbox'">
              <thead>
              <tr>
                <th><i18n>Messages</i18n></th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(message, index) in messages">
                <td>
                  <div class="media">
                    <div class="media-left" v-on:click="read(index)">
                      <p class="image is-64x64">
                        <img src="http://bulma.io/images/placeholders/128x128.png">
                      </p>
                    </div>
                    <div class="media-content" v-on:click="read(index)">
                      <div><strong>Type:</strong>&nbsp;{{message.constructor.name}}</div>
                      <div><strong v-if="message.data.from">From:</strong>&nbsp;{{message.data.from}}</div>
                    </div>
                    <div class="media-right" v-on:click="remove(index)">
                      <button class="delete" ></button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="!messages.length">
                <td>
                  <div class="center is-disabled"><i18n>No Messages</i18n></div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="column is-1"></div>
    </div>
  </section>
</template>

<style>
.signup .level-item { margin-top: 10px; }
.signup .level.top-align { align-items: flex-start; }
</style>

<script>
import backend from '../js/backend'
import * as db from '../js/database'
import * as Events from '../../../shared/events'
import {HapiNamespace} from '../js/backend/hapi'
var namespace = new HapiNamespace()
export default {
  name: 'Mailbox',
  mounted: function () {
    this.fetchData()
  },
  computed: {
    mailbox () {
      return this.$store.getters.mailbox
    }
  },
  methods: {
    fetchData: async function () {
      let current = await db.recentHash(this.mailbox)
      let messages = await db.collect(this.mailbox, current)
      for (let i = 0; i < messages.length; i++) {
        let msg = messages[i]
        switch (msg.constructor.name) {
          case 'PostMessage':
            if (!this.$store.state.mailFilter.contains(msg.toHash())) {
              this.inbox.push(msg)
            } else {
              this.deleted.push(msg)
            }
            break
          case 'PostInvite':
            if (!this.$store.state.mailFilter.contains(msg.toHash())) {
              this.invites.push(msg)
            } else {
              this.deleted.push(msg)
            }
            break
        }
      }
      switch (this.mode) {
        case 'inbox':
          this.messages = this.inbox
          break
        case 'compose':
          this.messages = this.inbox
          break
        case 'read':
          this.messages = this.inbox
          break
      }
    },
    cancel: function () {
      this.composedMessage = new Events.PostMessage({from: null, message: null}, null)
      this.inboxMode()
    },
    inboxMode: function () {
      this.mode = 'inbox'
      this.messages = this.inbox
    },
    deletedMode: function () {
      this.mode = 'inbox'
      this.messages = this.deleted
    },
    invitesMode: function () {
      this.mode = 'inbox'
      this.messages = this.invites
    },
    send: async function () {
      for (let i = 0; i < this.recipients.length; i++) {
        let recipient = this.recipients[i]
        let events = await backend.eventsSince(recipient.contractId, recipient.contractId)
        let [contract, ...actions] = events.map(e => {
          return Events[e.entry.type].fromObject(e.entry, e.hash)
        })
        let state = contract.toVuexState()
        actions.forEach(action => {
          let type = action.constructor.name
          contract.constructor.vuex.mutations[type](state, action.data)
        })
        let mailbox = await backend.latestHash(state.attributes.mailbox)
        let invite = new Events.PostMessage({from: this.$store.state.loggedIn, message: this.composedMessage.message}, mailbox)
        await backend.publishLogEntry(state.attributes.mailbox, invite)
      }
      this.inboxMode()
    },
    remove: function (index) {
      if (Number.isInteger(index)) {
        this.$store.dispatch('addToFilter', this.messages[index].toHash())
        this.deleted.push(this.messages[index])
        this.messages.splice(index, 1)
      } else {
        this.$store.dispatch('addToFilter', this.messages[this.currentIndex].toHash())
        this.deleted.push(this.messages[this.currentIndex])
        this.message.splice(this.currentIndex, 1)
        this.currentIndex = null
      }
    },
    compose: function () {
      this.mode = 'compose'
    },
    read: function (index) {
      this.mode = 'read'
      if (Number.isInteger(index)) {
        this.currentMessage = this.messages[index]
        this.currentIndex = index
      }
    },
    removeRecipient: function (index) {
      this.recipients.splice(index, 1)
    },
    addRecipient: async function () {
      if (this.recipient) {
        try {
          let contractId = await namespace.lookup(this.recipient)
          if (!this.recipients.find(recipient => recipient.name === this.recipient)) {
            this.recipients.push({name: this.recipient, contractId: contractId})
          }
          this.recipient = null
          this.error = false
        } catch (ex) {
          this.error = true
        }
      }
    }
  },
  data () {
    return {
      mode: 'compose',
      recipient: null,
      recipients: [],
      inbox: [],
      invites: [],
      deleted: [],
      messages: [],
      composedMessage: new Events.PostMessage({from: null, message: null}, null),
      currentMessage: new Events.PostMessage({from: null, message: null}, null),
      currentIndex: null,
      error: null
    }
  }
}
</script>
