<template>
  <section class="section full-screen">
    <div>
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
              <a data-test="composeLink" v-on:click="compose"><i18n>compose</i18n></a>
            </div>
            <div class="panel-block">
              <span class="panel-icon">
                <i class="fa fa-envelope"></i>
              </span>
              <a data-test="inboxLink" v-on:click="inboxMode"><i18n>inbox</i18n>
                <span class="unread"
                  data-test="inboxUnread"
                  v-if="$store.getters.unreadMessageCount"
                >
                  {{$store.getters.unreadMessageCount}}
                </span>
              </a>
            </div>
          </div>
        </div>
        <div class="column"></div>
        <div class="column is-two-thirds">
          <div id="compose" class="panel" v-if="mode === 'Compose'">
            <div class="panel-heading">
              <div><strong><i18n>Type</i18n>:</strong>&nbsp;<i18n>Message</i18n></div>
              <div><strong style="margin-top: auto;"><i18n>To</i18n>:</strong>&nbsp;
                <input id="AddRecipient"
                  class="input is-small"
                  type="text"
                  style="width: 80%;"
                  data-test="addRecipient"
                  v-model="recipient"
                  v-on:blur="addRecipient">
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
              <textarea class="textarea" data-test="composedMessage" v-model="composedMessage"></textarea>
            </div>
            <div class="panel-block" >
              <div id="errorMsg" v-if="errorMsg" class="help is-danger">{{errorMsg}}</div>
              <button class="button is-success" type="submit" data-test="sendButton" v-on:click="send" :disabled="!composedMessage"  style="margin-left:auto; margin-right: 0;"><i18n>Send</i18n></button>
              <button class="button is-danger" type="submit" v-on:click="cancel" style="margin-left:10px; margin-right: 0;"><i18n>Cancel</i18n></button>
            </div>
          </div>
          <div id="CurrentMessage" class="panel" v-if="mode === 'Read'">
            <div class="panel-heading">
              <div><strong>Type:</strong>&nbsp;{{currentMessage.data.messageType}}</div>
              <div><strong>Sent:</strong>&nbsp;{{formatDate(currentMessage.data.sentDate)}}</div>
              <div><strong>From:</strong>&nbsp;{{currentMessage.data.from}}</div>
            </div>
            <p class="panel-block" style="display: block; word-wrap: break-word;">{{currentMessage.data.message}}</p>

            <div class="panel-block" >
              <button class="button is-danger" v-if="currentMessage.data.messageType === 'Message'" type="submit" style="margin-left:auto; margin-right: 0;" v-on:click="remove(index)"><i18n>Delete</i18n></button>
              <button class="button is-primary" type="submit" v-on:click="inboxMode" style="margin-left:10px; margin-right: 0;"><i18n>Return</i18n></button>
            </div>
          </div>
          <table id="Proposals" class="table is-bordered is-striped is-narrow"  v-if="(mode === 'Inbox') && proposals.length">
            <thead>
            <tr>
              <th><i18n>Proposals</i18n></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(proposal, index) in proposals">
              <td>
                <div class="media">
                  <div class="media-left" v-on:click="respondToProposal(index)">
                    <p class="image is-64x64">
                      <!-- TODO: make this draw image from group contract -->
                      <img src="images/128x128.png">
                    </p>
                  </div>
                  <div class="media-content proposal-message"
                    data-test="proposalMessage"
                    v-on:click="respondToProposal(index)">
                    <div><strong>Sent:</strong>&nbsp;{{formatDate(proposal.initiationDate)}}</div>
                    <div><strong>From:</strong>&nbsp;{{proposal.groupName}}</div>
                  </div>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
          <table id="Invites" class="table is-bordered is-striped is-narrow is-fullwidth" v-if="(mode === 'Inbox') && invites.length">
            <thead>
            <tr>
              <th><i18n>Invites</i18n></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(message, index) in invites">
              <td>
                <div class="media" v-on:click="respondToInvite(index)">
                  <div class="media-left">
                    <p class="image is-64x64">
                      <!-- TODO: make this draw image from group contract -->
                      <img src="images/default-avatar.png">
                    </p>
                  </div>
                  <div
                    class="media-content invite-message"
                    data-test="inviteMessage"
                  >
                    <div><strong>Sent:</strong>&nbsp;{{formatDate(message.data.sentDate)}}</div>
                    <div><strong>From:</strong>&nbsp;{{message.data.from}}</div>
                  </div>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
          <table class="table is-bordered is-striped is-narrow is-fullwidth"
            data-test="inbox"
            v-if="(mode === 'Inbox')">
            <thead>
            <tr>
              <th><i18n>Inbox</i18n></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(message, index) in inbox">
              <td>
                <div class="media">
                  <div class="media-left" v-on:click="read({index, type: message.data.messageType})">
                    <p class="image is-64x64">
                      <img src="images/default-avatar.png">
                    </p>
                  </div>
                  <div class="media-content inbox-message"
                    data-test="inboxMessage"
                    v-on:click="read({index, type: message.data.messageType})"
                  >
                    <div><strong>Sent:</strong>&nbsp;{{formatDate(message.data.sentDate)}}</div>
                    <div><strong>From:</strong>&nbsp;{{message.data.from}}</div>
                    <span style="color: grey;">{{message.data.message.substr(0,50)}}{{message.data.message.length > 50 ? '...' : ''}} </span>
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

.unread {
  display: inline-block;
  padding: 2px 5px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  color: white;
  background-color: #1fc8db;
  border-radius: 20px;
}
</style>
<script>
import _ from 'lodash'
import backend from '../../controller/backend'
import * as Events from '../../../../shared/events'
import {namespace} from '../../controller/backend/hapi'
import {latestContractState} from '../../model/state'
import L from '../../js/translations'
const criteria = [(msg) => new Date(msg.sentDate)]
export default {
  name: 'Mailbox',
  computed: {
    inbox () {
      return _.sortBy(_.filter(this.$store.getters.mailbox, msg => msg.data.messageType === Events.HashableMailboxPostMessage.TypeMessage), criteria)
    },
    invites () {
      return _.sortBy(_.filter(this.$store.getters.mailbox, msg => msg.data.messageType === Events.HashableMailboxPostMessage.TypeInvite), criteria)
    },
    proposals () {
      return this.$store.getters.proposals
    }
  },
  methods: {
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
          let message = new Events.HashableMailboxPostMessage({
            sentDate: date.toString(),
            messageType: Events.HashableMailboxPostMessage.TypeMessage,
            from: this.$store.state.loggedIn.name,
            message: this.composedMessage
          }, mailbox)
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
        this.$store.commit('deleteMessage', this.inbox[index].hash)
      } else {
        this.$store.commit('deleteMessage', this.inbox[this.currentIndex].hash)
        this.currentIndex = null
        this.inboxMode()
      }
    },
    compose: function () {
      this.mode = 'Compose'
    },
    respondToProposal: function (index) {
      this.$router.push({ path: '/vote', query: { groupId: this.proposals[index].groupContractId, proposalHash: this.proposals[index].proposal } })
    },
    respondToInvite: function (index) {
      this.$store.commit('markMessageAsRead', this.invites[index].hash)
      this.$router.push({ path: '/join', query: { groupId: this.invites[index].data.headers[0], inviteHash: this.invites[index].hash } })
    },
    read: function ({index, type}) {
      this.mode = 'Read'
      if (Number.isInteger(index)) {
        this.currentMessage = this.inbox[index]
        this.currentIndex = index
        this.$store.commit('markMessageAsRead', this.currentMessage.hash)
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
      composedMessage: '',
      // place an empty message here so that the rendered doesn't complain about missing fields or data
      currentMessage: new Events.HashableMailboxPostMessage({from: null, message: ''}, null),
      currentIndex: null,
      error: null,
      errorMsg: null
    }
  }
}
</script>
