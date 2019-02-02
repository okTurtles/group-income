<template>
  <main>
    <div class="section">
      <div class="columns">
        <div class="column is-one-quarter">
          <div class="panel">
            <div class="panel-heading">
              <i18n>Menu</i18n>
            </div>
            <div class="panel-block">
              <span class="panel-icon">
                <i class="fa fa-pencil-alt"></i>
              </span>
              <a data-test="composeLink" v-on:click="compose" class="no-border"><i18n>compose</i18n></a>
            </div>
            <div class="panel-block">
              <span class="panel-icon">
                <i class="fa fa-envelope"></i>
              </span>
              <a data-test="inboxLink" v-on:click="inboxMode" class="no-border"><i18n>inbox</i18n>
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
          <div id="compose" class="panel" v-if="ephemeral.mode === 'Compose'">
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
              <span v-if="ephemeral.error" id="badUsername" class="help is-danger"><i18n>Invalid Username</i18n></span>
              <table>
                <tr v-for="(recipient, index) in ephemeral.recipients">
                  <td>
                    {{recipient.name}}
                    <i class="fa fa-minus-circle icon is-small" v-on:click="removeRecipient(index)" ></i>
                  </td>
                </tr>
              </table>
            </div>
            <div class="panel-block">
              <textarea class="textarea" data-test="composedMessage" v-model="ephemeral.composedMessage"></textarea>
            </div>
            <div class="panel-block" >
              <div id="errorMsg" v-if="ephemeral.errorMsg" class="help is-danger">{{ephemeral.errorMsg}}</div>
              <button class="button is-success" type="submit" data-test="sendButton" v-on:click="send" :disabled="!ephemeral.composedMessage"  style="margin-left:auto; margin-right: 0;"><i18n>Send</i18n></button>
              <button class="button is-danger" type="submit" v-on:click="cancel" style="margin-left:10px; margin-right: 0;"><i18n>Cancel</i18n></button>
            </div>
          </div>
          <div id="CurrentMessage" class="panel" v-if="ephemeral.mode === 'Read'">
            <div class="panel-heading">
              <div><strong>Type:</strong>&nbsp;{{ephemeral.currentMessage.data.messageType}}</div>
              <div><strong>Sent:</strong>&nbsp;{{formatDate(ephemeral.currentMessage.data.sentDate)}}</div>
              <div><strong>From:</strong>&nbsp;{{ephemeral.currentMessage.data.from}}</div>
            </div>
            <p class="panel-block" style="display: block; word-wrap: break-word;">{{ephemeral.currentMessage.data.message}}</p>

            <div class="panel-block" >
              <button class="button is-danger" v-if="ephemeral.currentMessage.data.messageType === 'Message'" type="submit" style="margin-left:auto; margin-right: 0;" v-on:click="remove(index)"><i18n>Delete</i18n></button>
              <button class="button is-primary" type="submit" v-on:click="inboxMode" style="margin-left:10px; margin-right: 0;"><i18n>Return</i18n></button>
            </div>
          </div>
          <table id="Proposals" class="table is-bordered is-striped is-narrow"  v-if="ephemeral.mode === 'Inbox' && proposals.length">
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
                      <img src="/simple/assets/images/128x128.png">
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
          <table id="Invites" class="table is-bordered is-striped is-narrow is-fullwidth" v-if="ephemeral.mode === 'Inbox' && invites.length">
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
                      <img src="/simple/assets/images/default-avatar.png">
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
            v-if="ephemeral.mode === 'Inbox'">
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
                      <img src="/simple/assets/images/default-avatar.png">
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
                  <div type="submit" class="media-right" v-on:click="remove(index, 'inbox')">
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
  </main>
</template>

<style scoped>
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
import sbp from '../../../shared/sbp.js'
import contracts from '../model/contracts.js'
import L from './utils/translations.js'

const criteria = (msg) => new Date(msg.sentDate)

// TODO: this whole file needs to be improved/rewritten

export default {
  name: 'Mailbox',
  data () {
    return {
      ephemeral: {
        mode: 'Inbox',
        recipients: [],
        error: null,
        errorMsg: null,
        composedMessage: '',
        // TODO: this is ugly, make it nicer
        // place an empty message here so that the rendered doesn't complain about missing fields or data
        currentMessage: { data: {} },
        currentIndex: null
      }
    }
  },
  computed: {
    inbox () {
      return this.$store.getters.mailbox.filter(msg => msg.data.messageType === contracts.MailboxPostMessage.TypeMessage).sort(criteria)
    },
    invites () {
      return this.$store.getters.mailbox.filter(msg => msg.data.messageType === contracts.MailboxPostMessage.TypeInvite).sort(criteria)
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
      this.ephemeral.composedMessage = ''
      this.ephemeral.recipients = []
    },
    inboxMode: function () {
      this.clearCompose()
      this.ephemeral.mode = 'Inbox'
      this.messages = this.inbox
    },
    deletedMode: function () {
      this.clearCompose()
      this.ephemeral.mode = 'Deleted'
      this.messages = this.deleted
    },
    invitesMode: function () {
      this.clearCompose()
      this.ephemeral.mode = 'Invites'
      this.messages = this.invites
    },
    send: async function () {
      try {
        for (let i = 0; i < this.ephemeral.recipients.length; i++) {
          let recipient = this.ephemeral.recipients[i]
          // TODO:: latestContractState is inefficient
          let state = await sbp('state/latestContractState', recipient.contractID)
          let message = await sbp('gi/contract/create-action', 'MailboxPostMessage', {
            sentDate: new Date().toISOString(),
            messageType: contracts.MailboxPostMessage.TypeMessage,
            from: this.$store.state.loggedIn.name,
            message: this.ephemeral.composedMessage
          }, state.attributes.mailbox)
          await sbp('backend/publishLogEntry', message)
        }
        this.inboxMode()
      } catch (ex) {
        console.log(ex)
        this.ephemeral.errorMsg = L('Failed to Send Message')
      }
    },
    remove: function (index) {
      if (Number.isInteger(index)) {
        this.$store.commit('deleteMessage', this.inbox[index].hash)
      } else {
        this.$store.commit('deleteMessage', this.inbox[this.ephemeral.currentIndex].hash)
        this.ephemeral.currentIndex = null
        this.inboxMode()
      }
    },
    compose: function () {
      this.ephemeral.mode = 'Compose'
    },
    respondToProposal: function (index) {
      this.$router.push({ path: '/vote', query: { groupId: this.proposals[index].groupContractId, proposalHash: this.proposals[index].proposal } })
    },
    respondToInvite: function (index) {
      this.$store.commit('markMessageAsRead', this.invites[index].hash)
      this.$router.push({ path: '/join', query: { groupId: this.invites[index].data.headers[0], inviteHash: this.invites[index].hash } })
    },
    read: function ({ index, type }) {
      this.ephemeral.mode = 'Read'
      if (Number.isInteger(index)) {
        this.ephemeral.currentMessage = this.inbox[index]
        this.ephemeral.currentIndex = index
        this.$store.commit('markMessageAsRead', this.ephemeral.currentMessage.hash)
      }
    },
    removeRecipient: function (index) {
      this.ephemeral.recipients.splice(index, 1)
    },
    addRecipient: async function () {
      if (this.recipient) {
        try {
          let contractID = await sbp('namespace/lookup', this.recipient)
          if (!this.ephemeral.recipients.find(recipient => recipient.name === this.recipient)) {
            this.ephemeral.recipients.push({ name: this.recipient, contractID: contractID })
          }
          this.recipient = null
          this.ephemeral.error = false
        } catch (ex) {
          this.ephemeral.error = true
        }
      }
    }
  }
}
</script>
