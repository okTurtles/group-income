<template>
  <section class="section full-screen">
    <div class="columns">
      <div class="column is-1"></div>
      <div class="column is-10" >
        <div class="columns">
          <div class="column is-one-quarter">
            <div class="panel">
              <div class="panel-heading">
                <i18n>Menu</i18n>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-pencil"></i>
                </span>
                <a v-on:click="compose"><i18n>compose</i18n></a>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-envelope"></i>
                </span>
                <a v-on:click="inboxMode"><i18n>inbox</i18n></a>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-users"></i>
                </span>
                <a v-on:click="invitesMode"><i18n>invites</i18n></a>
              </div>
              <div class="panel-block">
                <span class="panel-icon">
                  <i class="fa fa-trash"></i>
                </span>
                <a v-on:click="deletedMode"><i18n>deleted</i18n></a>
              </div>
            </div>
          </div>
          <div class="column"></div>
          <div class="column is-two-thirds">
            <div id="compose" class="panel" v-show="mode === 'Compose'">
              <div class="panel-heading">
                <div><strong><i18n>Type</i18n>:</strong>&nbsp;<i18n>PostMessage</i18n></div>
                <div><strong style="margin-top: auto"><i18n>To</i18n>:</strong>&nbsp;
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
                <textarea class="textarea" v-model="composedMessage"></textarea>
              </div>
              <div class="panel-block" >
                <button class="button is-success" type="submit" v-on:click="send" :disabled="!composedMessage"  style="margin-left:auto; margin-right: 0"><i18n>Send</i18n></button>
                <button class="button is-danger" type="submit" v-on:click="cancel" style="margin-left:10px; margin-right: 0"><i18n>Cancel</i18n></button>
              </div>
            </div>
            <div class="panel" v-show="mode === 'Read'">
              <div class="panel-heading">
                <div><strong>Type:</strong>&nbsp;{{currentMessage.constructor.name}}</div>
                <div><strong>From:</strong>&nbsp;{{ currentMessage.constructor.name === 'PostInvite' ? currentMessage.data.groupId : currentMessage.data.from}}</div>
              </div>
              <p class="panel-block" v-if="currentMessage.data.message">{{currentMessage.data.message}}</p>
              <p class="panel-block" v-if="currentMessage.constructor.name === 'PostInvite'"><router-link v-if="!$store.state.mailFilter.contains(currentMessage.toHash())" v-bind:to="{ path: '/join', query: { groupId: currentMessage.data.groupId, inviteHash: currentMessage.toHash() } }" ><i18n>Respond to Invite</i18n></router-link></p>
              <div class="panel-block" >
                <button class="button is-danger" v-if="currentMessage.constructor.name !== 'PostInvite'" type="submit" style="margin-left:auto; margin-right: 0" v-on:click="remove(index)"><i18n>Delete</i18n></button>
                <button class="button is-primary" type="submit" v-on:click="returnMode" style="margin-left:10px; margin-right: 0"><i18n>Return</i18n></button>
              </div>
            </div>
            <table class="table is-bordered is-striped is-narrow" v-show="(mode === 'Inbox') || (mode === 'Deleted') || (mode === 'Invites')">
              <thead>
              <tr>
                <th><i18n>{{mode}}</i18n></th>
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
                      <div v-if="message.data.from"><strong>From:</strong>&nbsp;{{message.data.from}}</div>
                      <div v-if="message.data.groupId"><strong>From:</strong>&nbsp;{{message.data.groupId}}</div>
                      <span v-if="message.data.message" style="color: grey">{{message.data.message.substr(0,50)}}...</span>
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
import _ from 'lodash'
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
    },
    newest () {
      return this.$store.state[this.mailbox].messages.length
    }
  },
  watch: {
    newest: function () {
      this.fetchData()
    }
  },
  methods: {
    fetchData: _.debounce(async function () {
      let current = await db.recentHash(this.mailbox)
      let messages = await db.collect(this.mailbox, current)
      this.inbox = []
      this.invites = []
      this.deleted = []
      this.messages = []
      for (let i = messages.length - 1; i >= 0; i--) {
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
        case 'Invites':
          this.messages = this.invites
          break
        case 'Deleted':
          this.messages = this.deleted
          break
        case 'Inbox':
          this.messages = this.inbox
          break
        case 'Compose':
          this.messages = this.inbox
          break
        case 'Read':
          this.messages = this.inbox
          break
      }
    }, 700, {maxWait: 5000}),
    cancel: function () {
      this.composedMessage = new Events.PostMessage({from: null, message: null}, null)
      this.inboxMode()
    },
    inboxMode: function () {
      this.mode = 'Inbox'
      this.messages = this.inbox
    },
    deletedMode: function () {
      this.mode = 'Deleted'
      this.messages = this.deleted
    },
    invitesMode: function () {
      this.mode = 'Invites'
      this.messages = this.invites
    },
    returnMode: function () {
      if (this.messages === this.deleted) {
        this.deletedMode()
      }
      if (this.messages === this.inbox) {
        this.inboxMode()
      }
      if (this.messages === this.invites) {
        this.invitesMode()
      }
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
        let invite = new Events.PostMessage({from: this.$store.state.loggedIn, message: this.composedMessage}, mailbox)
        await backend.publishLogEntry(state.attributes.mailbox, invite)
      }
      this.composedMessage = ''
      this.inboxMode()
    },
    remove: function (index) {
      if (Number.isInteger(index)) {
        if (this.mode === 'Deleted') {
          this.$store.dispatch('removeFromFilter', this.messages[index].toHash())
          this.messages.splice(index, 1)
          this.fetchData()
        } else {
          this.$store.dispatch('addToFilter', this.messages[index].toHash())
          this.deleted.push(this.messages[index])
          this.messages.splice(index, 1)
        }
      } else {
        this.$store.dispatch('addToFilter', this.messages[this.currentIndex].toHash())
        this.deleted.push(this.messages[this.currentIndex])
        this.messages.splice(this.currentIndex, 1)
        this.currentIndex = null
        this.inboxMode()
      }
    },
    compose: function () {
      this.mode = 'Compose'
    },
    read: function (index) {
      this.mode = 'Read'
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
      mode: 'Inbox',
      recipient: null,
      recipients: [],
      inbox: [],
      invites: [],
      deleted: [],
      messages: [],
      composedMessage: '',
      currentMessage: new Events.PostMessage({from: null, message: ''}, null),
      currentIndex: null,
      error: null
    }
  }
}
</script>
