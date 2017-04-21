<template>
  <section class="section full-screen">
    <div class="centered" >
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
              <a id="ComposeLink" v-on:click="compose"><i18n>compose</i18n></a>
            </div>
            <div class="panel-block">
              <span class="panel-icon">
                <i class="fa fa-envelope"></i>
              </span>
              <a id="InboxLink" v-on:click="inboxMode"><i18n>inbox</i18n> <span class="unread" v-if="$store.getters.unreadMessageCount">{{$store.getters.unreadMessageCount}}</span></a>
            </div>
          </div>
        </div>
        <div class="column"></div>
        <div class="column is-two-thirds">
          <div id="compose" class="panel" v-show="mode === 'Compose'">
            <div class="panel-heading">
              <div><strong><i18n>Type</i18n>:</strong>&nbsp;<i18n>Message</i18n></div>
              <div><strong style="margin-top: auto"><i18n>To</i18n>:</strong>&nbsp;
                <input id="AddRecipient" class="input is-small" type="text" style="width: 80%;" v-model="recipient" v-on:blur="addRecipient">
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
              <textarea id="ComposedMessage" class="textarea" v-model="composedMessage"></textarea>
            </div>
            <div class="panel-block" >
              <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
              <button id="SendButton" class="button is-success" type="submit" v-on:click="send" :disabled="!composedMessage"  style="margin-left:auto; margin-right: 0"><i18n>Send</i18n></button>
              <button class="button is-danger" type="submit" v-on:click="cancel" style="margin-left:10px; margin-right: 0"><i18n>Cancel</i18n></button>
            </div>
          </div>
          <div id="CurrentMessage" class="panel" v-show="mode === 'Read'">
            <div class="panel-heading">
              <div><strong>Type:</strong>&nbsp;{{currentMessage.messageType}}</div>
              <div><strong>Sent:</strong>&nbsp;{{formatDate(currentMessage.sentDate)}}</div>
              <div><strong>From:</strong>&nbsp;{{currentMessage.messageType === 'Invite' ?  currentMessage.message : currentMessage.from}}</div>
            </div>
            <p class="panel-block" v-if="currentMessage.messageType === 'Message'" style="display: block; word-wrap: break-word;">{{currentMessage.message}}</p>
            <p class="panel-block" v-if="currentMessage.messageType === 'Invite'"><router-link v-bind:to="{ path: '/join', query: { groupId: currentMessage.message, inviteId: currentMessage.id} }" ><i18n>Respond to Invite</i18n></router-link></p>
            <div class="panel-block" >
              <button class="button is-danger" v-if="currentMessage.messageType === 'Message'" type="submit" style="margin-left:auto; margin-right: 0" v-on:click="remove(index)"><i18n>Delete</i18n></button>
              <button class="button is-primary" type="submit" v-on:click="inboxMode" style="margin-left:10px; margin-right: 0"><i18n>Return</i18n></button>
            </div>
          </div>
          <table id="Invites" class="table is-bordered is-striped is-narrow"  v-show="(mode === 'Inbox')" v-if="invites.length">
            <thead>
            <tr>
              <th><i18n>Invites</i18n></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(message, index) in invites">
              <td>
                <div class="media">
                  <div class="media-left" v-on:click="readInvite(index)">
                    <p class="image is-64x64">
                      <img src="http://bulma.io/images/placeholders/128x128.png">
                    </p>
                  </div>
                  <div class="media-content invite-message" v-on:click="readInvite(index)">
                    <div><strong>Sent:</strong>&nbsp;{{formatDate(message.sentDate)}}</div>
                    <div><strong>From:</strong>&nbsp;{{message.message}}</div>
                  </div>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
          <table id="Inbox" class="table is-bordered is-striped is-narrow" v-show="(mode === 'Inbox')">
            <thead>
            <tr>
              <th><i18n>Inbox</i18n></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(message, index) in inbox">
              <td>
                <div class="media">
                  <div class="media-left" v-on:click="read(index)">
                    <p class="image is-64x64">
                    </p>
                  </div>
                  <div class="media-content inbox-message" v-on:click="read(index)">
                    <div><strong>Sent:</strong>&nbsp;{{formatDate(message.sentDate)}}</div>
                    <div><strong>From:</strong>&nbsp;{{message.from}}</div>
                    <span style="color: grey">{{message.message.substr(0,50)}}{{message.message.length > 50 ? '...' : ''}} </span>
                  </div>
                  <div type="submit"class="media-right" v-on:click="remove(index, 'inbox')">
                    <button  class="delete" ></button>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="!inbox.length">
              <td>
                <div class="center is-disabled"><i18n>No Messages</i18n></div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
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
import * as Events from '../../../shared/events'
import {HapiNamespace} from '../js/backend/hapi'
import {latestContractState} from '../js/state'
import L from '../js/translations'
import Picture from './ProfilePicture.vue'
var namespace = new HapiNamespace()
export default {
  name: 'Mailbox',
  components: [Picture],
  mounted: function () {
    this.fetchData()
  },
  computed: {
    mail () {
      return this.$store.getters.mailbox
    }
  },
  watch: {
    mail: function () {
      this.fetchData()
    }
  },
  methods: {
    fetchData: async function () {
      this.inbox = []
      this.invites = []
      for (let i = this.mail.length - 1; i >= 0; i--) {
        let msg = this.mail[i]
        if (msg.messageType === 'Invite') {
          this.invites.push(msg)
        } else {
          this.inbox.push(msg)
        }
      }
      let criteria = [(msg) => new Date(msg.sentDate)]
      _.sortBy(this.inbox, criteria)
      _.sortBy(this.invites, criteria)
    },
    formatDate: function (date) {
      if (date) {
        let formatString = new Date(date)
        return formatString.toString()
      }
    },
    cancel: function () {
      this.inboxMode()
    },
    clearCompose: function () {
      this.composedMessage = ''
      this.recipients = []
    },
    inboxMode: function () {
      this.clearCompose()
      this.mode = 'Inbox'
      this.messages = this.inbox
    },
    deletedMode: function () {
      this.clearCompose()
      this.mode = 'Deleted'
      this.messages = this.deleted
    },
    invitesMode: function () {
      this.clearCompose()
      this.mode = 'Invites'
      this.messages = this.invites
    },
    send: async function () {
      try {
        for (let i = 0; i < this.recipients.length; i++) {
          let recipient = this.recipients[i]
          let state = await latestContractState(recipient.contractId)
          let mailbox = await backend.latestHash(state.attributes.mailbox)
          let date = new Date()
          let message = new Events.PostMessage({sentDate: date.toString(), messageType: Events.PostMessage.TypeMessage, from: this.$store.state.loggedIn, message: this.composedMessage}, mailbox)
          await backend.publishLogEntry(state.attributes.mailbox, message)
        }
        this.inboxMode()
      } catch (ex) {
        console.log(ex)
        this.errorMsg = L('Failed to Send Message')
      }
    },
    remove: function (index) {
      if (Number.isInteger(index)) {
        this.$store.dispatch('deleteMessage', this.inbox[index].id)
      } else {
        this.$store.dispatch('deleteMessage', this.inbox[this.currentIndex].id)
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
        this.currentMessage = this.inbox[index]
        this.currentIndex = index
        this.$store.dispatch('markMessageAsRead', this.currentMessage.id)
      }
    },
    readInvite: function (index) {
      this.mode = 'Read'
      if (Number.isInteger(index)) {
        this.currentMessage = this.invites[index]
        this.currentIndex = index
        this.$store.dispatch('markMessageAsRead', this.currentMessage.id)
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
      composedMessage: '',
      currentMessage: new Events.PostMessage({from: null, message: ''}, null),
      currentIndex: null,
      error: null,
      errorMsg: null
    }
  }
}
</script>
